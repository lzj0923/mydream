package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletionException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class CreatorVideoLookup {
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper;
    private final String base;
    private CreatorAccountService accounts;
    @org.springframework.beans.factory.annotation.Autowired
    public CreatorVideoLookup(ObjectMapper mapper,@Value("${APP_AUTH_API_URL:https://share.the-drama-has-a-plot.com}") String base,CreatorAccountService accounts){this(mapper,base);this.accounts=accounts;}
    public CreatorVideoLookup(ObjectMapper mapper,@Value("${APP_AUTH_API_URL:https://share.the-drama-has-a-plot.com}") String base){this.mapper=mapper;this.base=base.replaceAll("/+$","");}
    public record Video(long id,String title) {}
    public List<Video> ownedVideos(String owner,String authorization,List<Long> ids){
        if(owner.startsWith("creator:")) {
            if(accounts==null) throw ApiException.invalid("請先綁定 App 賬號");
            return ownedVideos(accounts.appOwner(owner),authorization,ids);
        }
        if(!owner.startsWith("app:")||authorization==null||!authorization.startsWith("Bearer "))throw ApiException.invalid("请使用 App 创作者账号关联自己的视频");
        if(ids==null||ids.isEmpty()||ids.size()>10||ids.stream().anyMatch(id->id==null||id<1)||ids.stream().distinct().count()!=ids.size())throw ApiException.invalid("请选择 1 至 10 个不同的视频");
        var pending=ids.stream().map(id->client.sendAsync(HttpRequest.newBuilder(URI.create(base+"/api/video/getVideoInfo?videoId="+id))
            .timeout(Duration.ofSeconds(10)).header("token",authorization.substring(7)).header("Accept","application/json").GET().build(),HttpResponse.BodyHandlers.ofString())
            .thenApply(response->{
                var root=mapper.readTree(response.body());var row=root.path("data");
                if(response.statusCode()!=200||root.path("code").asInt()!=1)throw ApiException.invalid("视频不可用，请刷新作品列表后重试");
                if(row.path("id").asLong()!=id||!owner.equals("app:"+row.path("user_id").asLong())||!row.path("status").asText().equals("normal")||(!row.path("deletetime").isMissingNode()&&!row.path("deletetime").isNull()&&!row.path("deletetime").asText().isEmpty()&&!row.path("deletetime").asText().equals("0")))throw ApiException.invalid("只能关联本人未删除且正常展示的 App 视频");
                String title=row.path("title").asText("未命名视频");return new Video(id,title.substring(0,Math.min(200,title.length())));
            })).toList();
        try{return pending.stream().map(java.util.concurrent.CompletableFuture::join).toList();}
        catch(CompletionException e){pending.forEach(p->p.cancel(true));if(e.getCause() instanceof ApiException a)throw a;throw ApiException.unavailable("App 视频验证暂时不可用，请稍后重试");}
    }
}
