package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import java.util.Base64;
import java.util.Map;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
class AppReviewAccessTest {
 final String key="test-only-review-bridge-key-32-characters";
 final ObjectMapper mapper=new ObjectMapper();
 String sign(String method,String uri,long expires,String secret)throws Exception{
  String payload=Base64.getUrlEncoder().withoutPadding().encodeToString(mapper.writeValueAsBytes(Map.of("actor","42","method",method,"uri",uri,"expires",expires)));
  var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
  return "ar_"+payload+"."+Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
 }
 @Test void appAssertionWorksWithoutCmsSessionAndPreservesReviewerIdentity()throws Exception{
  var access=new CreatorAccess(mapper,"http://127.0.0.1:1");ReflectionTestUtils.setField(access,"reviews",new AppReviewAccess(key,mapper));
  var request=new MockHttpServletRequest("POST","/creator-api/v1/verification-reviews/record-1");
  request.addHeader("Authorization","Bearer "+sign("POST",request.getRequestURI(),Instant.now().getEpochSecond()+30,key));
  var viewer=access.require(request,null);assertThat(viewer.admin()).isTrue();assertThat(viewer.ownerKey()).isEqualTo("app-admin:42");assertThat(request.getSession(false)).isNull();
 }
 @Test void forgedExpiredAndRepurposedAssertionsAreRejected()throws Exception{
  var access=new AppReviewAccess(key,mapper);long now=Instant.now().getEpochSecond();String uri="/creator-api/v1/verification-reviews";
  var request=new MockHttpServletRequest("GET",uri);
  for(String token:new String[]{sign("GET",uri,now-1,key),sign("GET",uri,now+80,key),sign("POST",uri,now+30,key),sign("GET",uri+"/other",now+30,key),sign("GET",uri,now+30,"wrong-key-32-characters-for-testing")})assertThatThrownBy(()->access.require(token,request)).isInstanceOf(com.mydream.cms.shared.ApiException.class);
  var unrelated=new MockHttpServletRequest("GET","/creator-api/v1/workspace");String token=sign("GET",unrelated.getRequestURI(),now+30,key);assertThatThrownBy(()->access.require(token,unrelated)).isInstanceOf(com.mydream.cms.shared.ApiException.class);
 }
}
