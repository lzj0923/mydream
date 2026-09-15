package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class CreatorAccess {
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper;
    private final String appBase;
    private CreatorAccountService accounts;
    @org.springframework.beans.factory.annotation.Autowired
    private AppReviewAccess reviews;

    @org.springframework.beans.factory.annotation.Autowired
    public CreatorAccess(ObjectMapper mapper, @Value("${APP_AUTH_API_URL:https://share.the-drama-has-a-plot.com}") String appBase, CreatorAccountService accounts) {
        this(mapper,appBase); this.accounts=accounts;
    }

    public CreatorAccess(ObjectMapper mapper, @Value("${APP_AUTH_API_URL:https://share.the-drama-has-a-plot.com}") String appBase) {
        this.mapper = mapper;
        this.appBase = appBase.replaceAll("/+$", "");
    }

    public record Viewer(String ownerKey, String name, boolean admin, CreatorWorkType workType) {
        public Viewer(String key,String name,boolean admin){this(key,name,admin,null);}
        public String agreementFilter(){return admin||workType==null?"":" AND (scope_key='membership' OR EXISTS (SELECT 1 FROM cms_creator_script p WHERE p.id=scope_key AND p.owner_key=cms_creator_agreement.owner_key"+typeFilter("p.")+"))";}
        public String typeFilter(String prefix){return admin||workType==null?"":workType.where(prefix);}
    }

    public Viewer require(HttpServletRequest request, Authentication authentication) {
        var authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            var token = authorization.substring(7);
            if(token.startsWith("ar_")) {
                if(reviews==null) throw unauthorized();
                return reviews.require(token,request);
            }
            if(token.startsWith("cr_")) {
                if(accounts==null) throw unauthorized();
                return accounts.viewer(token);
            }
            if (token.isBlank() || token.length() > 4096) throw unauthorized();
            try {
                var response = client.send(HttpRequest.newBuilder(URI.create(appBase + "/api/user/userInfo"))
                        .timeout(Duration.ofSeconds(10)).header("token", token).header("Accept", "application/json")
                        .GET().build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 500) throw ApiException.unavailable("App 登录服务暂时不可用，请稍后重试");
                var envelope = mapper.readTree(response.body());
                var data = envelope.path("data");
                var user = data.has("userinfo") ? data.path("userinfo") : data;
                if (response.statusCode() != 200 || envelope.path("code").asInt() != 1 || user.path("id").asLong() < 1) throw unauthorized();
                return new Viewer("app:" + user.path("id").asLong(), user.path("username").asText("创作者"), false);
            } catch (ApiException exception) { throw exception; }
            catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw ApiException.unavailable("登录验证暂时不可用"); }
            catch (Exception exception) { throw ApiException.unavailable("App 登录服务暂时不可用，请稍后重试"); }
        }
        throw unauthorized();
    }

    private static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "CREATOR_LOGIN_REQUIRED", "请先登录创作者账号");
    }

    public String appAuthorization(HttpServletRequest request) {
        String authorization=request.getHeader("Authorization");
        if(authorization!=null && authorization.startsWith("Bearer cr_")) {
            if(accounts==null) throw unauthorized();
            return "Bearer "+accounts.appSession(authorization.substring(7),request.getRequestURI().endsWith("/uploads")?"UPLOAD":"SUBMIT").token();
        }
        return authorization;
    }
}
