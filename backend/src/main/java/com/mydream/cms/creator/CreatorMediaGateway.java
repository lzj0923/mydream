package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Uses existing App endpoints only. Never calls addVideo or writes App dramas/episodes. */
@Component
public class CreatorMediaGateway {
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper;
    private final String base;
    public CreatorMediaGateway(ObjectMapper mapper, @Value("${APP_AUTH_API_URL:https://share.the-drama-has-a-plot.com}") String base) {
        this.mapper=mapper; this.base=base.replaceAll("/+$", "");
    }
    private JsonNode call(String path, String authorization, Map<String,String> body) {
        try {
            var request=HttpRequest.newBuilder(URI.create(base+path)).timeout(Duration.ofSeconds(12)).header("Accept","application/json");
            if(authorization!=null&&authorization.startsWith("Bearer ")) request.header("token",authorization.substring(7));
            if(body==null) request.GET();
            else request.header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(
                body.entrySet().stream().map(e->URLEncoder.encode(e.getKey(),StandardCharsets.UTF_8)+"="+URLEncoder.encode(e.getValue(),StandardCharsets.UTF_8)).collect(java.util.stream.Collectors.joining("&"))));
            var response=client.send(request.build(),HttpResponse.BodyHandlers.ofString());
            var root=mapper.readTree(response.body());
            if(response.statusCode()!=200||root.path("code").asInt()!=1) throw ApiException.unavailable("App 媒體服務暫時不可用，請稍後重試");
            return root.path("data");
        } catch(ApiException e){throw e;}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw ApiException.unavailable("App 請求已中斷");}
        catch(Exception e){throw ApiException.unavailable("無法核對 App 資料，請稍後重試");}
    }
    public JsonNode create(String authorization,String title,String filename) {
        var data=call("/api/vod/createUploadAuth",authorization,Map.of("title",title,"filename",filename));
        if(!data.path("VideoId").asText().matches("[a-zA-Z0-9-]{16,80}")||!data.path("attachment_id").asText().matches("[0-9]{1,20}")||data.path("UploadAuth").asText().isBlank()||data.path("UploadAddress").asText().isBlank())
            throw ApiException.unavailable("App 未返回完整上傳授權");
        return data;
    }
    public JsonNode attachment(String id,String vodId) {
        var data=call("/api/vod/getAttachmentInfo",null,Map.of("attachmentId",id));
        if(!id.equals(data.path("id").asText())||!vodId.equals(data.path("vod_video_id").asText()))throw ApiException.conflict("上傳附件身份不一致，請重新上傳");
        return data;
    }
    public String readyMedia(String attachmentId,String vodId) {
        var data=attachment(attachmentId,vodId);
        String status=data.path("vod_status").asText();
        if(List.of("failed","error","upload_failed","transcode_failed").contains(status))throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,"MEDIA_PROCESSING_FAILED","雲端視頻處理失敗，請聯絡平台核查或重新上傳視頻");
        if(List.of("pending_upload","uploading","uploaded","transcoding","processing").contains(status))throw processing();
        if(!"completed".equals(status))throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,"MEDIA_STATUS_UNKNOWN","暫時無法確認雲端視頻狀態，請稍後重試或聯絡平台");
        return mediaUrls(data).stream().findFirst().orElseThrow(CreatorMediaGateway::processing);
    }
    private static ApiException processing(){return new ApiException(org.springframework.http.HttpStatus.CONFLICT,"MEDIA_PROCESSING","視頻已上傳，雲端處理中，完成後將自動繼續提交");}
    static List<String> mediaUrls(JsonNode data) {
        var urls=new ArrayList<String>();
        for(String key:List.of("vod_play_url_hd","vod_play_url_sd","vod_play_url_uhd","fullurl","url")){
            String value=data.path(key).asText(); if(canonicalMedia(value)!=null) urls.add(value);
        }
        return urls;
    }
    static String canonicalMedia(String value) {
        try {var uri=URI.create(value); if(!List.of("http","https").contains(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getPath()==null||uri.getPath().startsWith("/vod/"))return null;
            return uri.getHost().toLowerCase(Locale.ROOT)+":"+(uri.getPort()==-1?"":uri.getPort())+uri.getRawPath();
        }catch(Exception e){return null;}
    }
    private static ApiException publication(String code,String message){return new ApiException(org.springframework.http.HttpStatus.CONFLICT,"PUBLICATION_"+code,message);}
    public record Published(long dramaId,long episodeId,int episodeNumber,String title) {}
    public Published verify(long dramaId,long episodeId,int number,String attachmentId,String vodId) {
        // Existing unfiltered ID lookup distinguishes deletion from unpublished content.
        var existence=call("/api/drama/dramaDetailOther?id="+dramaId+"&dramaId="+dramaId,null,null);
        if(existence.isNull())throw publication("DELETED","App 劇目已刪除，原關聯集數可重新上傳");
        if(existence.path("id").asLong()!=dramaId)throw ApiException.unavailable("App 劇目核對返回異常，稍後重試");
        if(!"published".equals(existence.path("status").asText()))throw publication("OFFLINE","App 劇目已下架或尚未上架，請聯繫平台確認原因");
        long deadline=System.nanoTime()+Duration.ofSeconds(20).toNanos();
        var media=mediaUrls(attachment(attachmentId,vodId)).stream().map(CreatorMediaGateway::canonicalMedia).collect(java.util.stream.Collectors.toSet());
        // Existing public detail endpoint returns published episode media, including paid episode metadata.
        for(int page=1;page<=50;page++) {
            if(System.nanoTime()>deadline)throw ApiException.unavailable("App 資料讀取較慢，請稍後重新核對");
            var data=call("/api/drama/dramaDetail?id="+dramaId+"&page="+page+"&limit=100",null,null);
            if(data.path("drama").path("id").asLong()!=dramaId)throw publication("MISSING","App 未返回原關聯劇目，請由後台核對是否刪除或更換編號");
            if(!"published".equals(data.path("drama").path("status").asText()))throw publication("OFFLINE","App 劇目尚未上架或已下架");
            var episodes=data.path("episodes").path("data");
            for(var episode:episodes) if(episode.path("id").asLong()==episodeId){
                if(episode.path("drama_num").asInt()!=number)throw publication("MISMATCH","App 劇集集數與原關聯不一致");
                if(!"published".equals(episode.path("status").asText()))throw publication("OFFLINE","App 劇集已下架或尚未上架");
                var candidates=new ArrayList<String>();candidates.add(episode.path("video_url").asText());episode.path("video_urls").forEach(url->candidates.add(url.asText()));
                if(candidates.stream().map(CreatorMediaGateway::canonicalMedia).filter(Objects::nonNull).noneMatch(media::contains))throw publication("MISMATCH","App 劇集使用的視頻與已驗收交付稿不一致");
                return new Published(dramaId,episodeId,number,episode.path("title").asText());
            }
            int last=data.path("episodes").path("last_page").asInt(1);
            if(page>=last||episodes.isEmpty())break;
        }
        throw publication("MISSING","App 劇目下未返回原關聯劇集，請由後台核對刪除或下架記錄");
    }
}

