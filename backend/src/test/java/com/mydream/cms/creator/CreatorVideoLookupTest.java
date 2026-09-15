package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import com.mydream.cms.shared.ApiException;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
class CreatorVideoLookupTest {
 @Test void validatesRealUpstreamOwnershipAndAvailability() throws Exception{
  var body=new AtomicReference<>("{\"code\":1,\"data\":{\"id\":5,\"user_id\":452,\"status\":\"normal\",\"title\":\"Mine\",\"deletetime\":null}}");
  var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);server.createContext("/api/video/getVideoInfo",e->{assertThat(e.getRequestHeaders().getFirst("token")).isEqualTo("fixture");var bytes=body.get().getBytes(StandardCharsets.UTF_8);e.sendResponseHeaders(200,bytes.length);e.getResponseBody().write(bytes);e.close();});server.start();
  try{var lookup=new CreatorVideoLookup(new ObjectMapper(),"http://127.0.0.1:"+server.getAddress().getPort());
   assertThat(lookup.ownedVideos("app:452","Bearer fixture",List.of(5L))).containsExactly(new CreatorVideoLookup.Video(5,"Mine"));
   assertThatThrownBy(()->lookup.ownedVideos("app:453","Bearer fixture",List.of(5L))).isInstanceOf(ApiException.class);
   assertThatThrownBy(()->lookup.ownedVideos("app:452","Bearer fixture",List.of(5L,5L))).isInstanceOf(ApiException.class);
   body.set("{\"code\":1,\"data\":{\"id\":5,\"user_id\":452,\"status\":\"normal\",\"deletetime\":123}}");
   assertThatThrownBy(()->lookup.ownedVideos("app:452","Bearer fixture",List.of(5L))).isInstanceOf(ApiException.class);
  }finally{server.stop(0);}
 }
}
