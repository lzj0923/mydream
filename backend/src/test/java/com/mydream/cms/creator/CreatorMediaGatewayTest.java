package com.mydream.cms.creator;

import static org.assertj.core.api.Assertions.*;
import com.mydream.cms.shared.ApiException;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.*;
import tools.jackson.databind.ObjectMapper;

class CreatorMediaGatewayTest {
    HttpServer server; CreatorMediaGateway gateway;
    String vod="trusted-video-00001", status="completed", dramaStatus="published", episodeStatus="published", url="https://cdn.example/episode-1.mp4?token=new";
    int number=1, calls=0; boolean secondPage=false, deleted=false;
    List<String> paths=new ArrayList<>();
    @BeforeEach void start() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            String path=exchange.getRequestURI().getPath();paths.add(path);calls++;
            String data;
            if(path.equals("/api/vod/createUploadAuth")) {
                assertThat(exchange.getRequestHeaders().getFirst("token")).isEqualTo("fixture");
                data="{\"VideoId\":\"trusted-video-00001\",\"attachment_id\":42,\"UploadAuth\":\"auth\",\"UploadAddress\":\"address\"}";
            } else if(path.equals("/api/vod/getAttachmentInfo")) {
                assertThat(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8)).isEqualTo("attachmentId=42");
                data="{\"id\":42,\"vod_video_id\":\""+vod+"\",\"vod_status\":\""+status+"\",\"vod_play_url_hd\":\"https://cdn.example/episode-1.mp4?token=old\",\"url\":\"/vod/placeholder\"}";
            } else if(path.equals("/api/drama/dramaDetailOther")) {
                data=deleted?"null":"{\"id\":7,\"status\":\""+dramaStatus+"\"}";
            } else if(path.equals("/api/drama/dramaDetail")) {
                boolean empty=secondPage&&!exchange.getRequestURI().getQuery().contains("page=2");
                data="{\"drama\":{\"id\":7,\"status\":\""+dramaStatus+"\"},\"episodes\":{\"last_page\":"+(secondPage?2:1)+",\"data\":["+(empty?"{\"id\":88}":"{\"id\":90,\"title\":\"episode\",\"drama_num\":"+number+",\"status\":\""+episodeStatus+"\",\"video_urls\":{\"hd\":\""+url+"\"}}")+"]}}";
            } else { exchange.sendResponseHeaders(500,-1);exchange.close();return; }
            byte[] body=("{\"code\":1,\"data\":"+data+"}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type","application/json");exchange.sendResponseHeaders(200,body.length);exchange.getResponseBody().write(body);exchange.close();
        });server.start();gateway=new CreatorMediaGateway(new ObjectMapper(),"http://127.0.0.1:"+server.getAddress().getPort());
    }
    @AfterEach void stop(){server.stop(0);}
    @Test void existingUploadAuthOnlyAndReadyAttachment(){
        assertThat(gateway.create("Bearer fixture","Story","story.mp4").path("attachment_id").asInt()).isEqualTo(42);
        assertThat(gateway.readyMedia("42",vod)).contains("episode-1.mp4");
        assertThat(paths).containsExactly("/api/vod/createUploadAuth","/api/vod/getAttachmentInfo");
    }
    @Test void cannotSubmitOtherAttachmentOrProcessingMedia(){
        assertThatThrownBy(()->gateway.readyMedia("42","wrong-video")).isInstanceOf(ApiException.class);
        status="processing";assertThatThrownBy(()->gateway.readyMedia("42",vod)).hasMessageContaining("雲端處理");
    }
    @Test void processingHasRetryableCodeAndFailureDoesNot(){
        status="transcoding";
        assertThatThrownBy(()->gateway.readyMedia("42",vod)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("MEDIA_PROCESSING"));
        status="failed";
        assertThatThrownBy(()->gateway.readyMedia("42",vod)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("MEDIA_PROCESSING_FAILED"));
    }
    @Test void verifiesPaidEpisodeMetadataAndFollowsPaginationIgnoringExpiredQuerySignature(){
        secondPage=true;assertThat(gateway.verify(7,90,1,"42",vod).episodeId()).isEqualTo(90);assertThat(calls).isEqualTo(4);
    }
    @Test void rejectsWrongMediaEpisodeNumberAndUnpublishedStates(){
        url="https://cdn.example/another.mp4";assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).hasMessageContaining("視頻與");
        url="https://attacker.example/episode-1.mp4";assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).isInstanceOf(ApiException.class);
        number=2;assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).hasMessageContaining("集數");
        number=1;episodeStatus="draft";assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).isInstanceOf(ApiException.class);
        dramaStatus="draft";assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).hasMessageContaining("尚未上架");
    }
    @Test void classifiesUnavailableAndChangedPublications(){
        episodeStatus="draft";
        assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("PUBLICATION_OFFLINE"));
        episodeStatus="published";number=2;
        assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("PUBLICATION_MISMATCH"));
        number=1;
        assertThatThrownBy(()->gateway.verify(7,999,1,"42",vod)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("PUBLICATION_MISSING"));
    }
    @Test void deletionRequiresUnfilteredLookupAndOfflineStaysLocked(){
        dramaStatus="inactive";
        assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("PUBLICATION_OFFLINE"));
        deleted=true;
        assertThatThrownBy(()->gateway.verify(7,90,1,"42",vod)).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("PUBLICATION_DELETED"));
    }
    @Test void rejectsUnsafeAndPlaceholderMediaUrls(){
        for(String value:List.of("javascript:alert(1)","https://user:pass@cdn.example/video.mp4","/local.mp4","https://cdn.example/vod/id"))assertThat(CreatorMediaGateway.canonicalMedia(value)).isNull();
    }
}
