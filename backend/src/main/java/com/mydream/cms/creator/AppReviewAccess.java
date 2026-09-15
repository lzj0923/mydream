package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Accepts only short-lived, route-bound assertions issued after App administrator validation. */
@Component
public class AppReviewAccess {
 private final String key; private final ObjectMapper mapper;
 public AppReviewAccess(@Value("${CMS_APP_REVIEW_KEY:}") String key,ObjectMapper mapper){this.key=key;this.mapper=mapper;}
 public CreatorAccess.Viewer require(String token,HttpServletRequest request){
  try {
   if(key.length()<32||token.length()>2048) throw new IllegalArgumentException();
   String[] parts=token.substring(3).split("\\.");
   if(parts.length!=2)throw new IllegalArgumentException();
   var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
   if(!MessageDigest.isEqual(mac.doFinal(parts[0].getBytes(StandardCharsets.UTF_8)),Base64.getUrlDecoder().decode(parts[1])))throw new IllegalArgumentException();
   var data=mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
   long expires=data.path("expires").asLong(),now=Instant.now().getEpochSecond();
   String actor=data.path("actor").asText(),uri=request.getRequestURI();
   if(expires<now||expires>now+35||!actor.matches("[1-9][0-9]{0,18}")||!data.path("method").asText().equals(request.getMethod())||!data.path("uri").asText().equals(uri))throw new IllegalArgumentException();
   if(!uri.matches("/creator-api/v1/(verification-reviews|contract-reviews|contract-templates|reviews|interest-reviews|project-reviews)(/[^.?#]*)?"))throw new IllegalArgumentException();
   return new CreatorAccess.Viewer("app-admin:"+actor,"App 管理員 #"+actor,true);
  }catch(Exception exception){throw new ApiException(HttpStatus.UNAUTHORIZED,"APP_REVIEW_LOGIN_REQUIRED","請使用 App 管理員賬號登錄後審核");}
 }
}
