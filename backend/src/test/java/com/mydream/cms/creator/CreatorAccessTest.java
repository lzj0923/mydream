package com.mydream.cms.creator;

import static org.assertj.core.api.Assertions.*;
import com.mydream.cms.shared.ApiException;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import tools.jackson.databind.ObjectMapper;

class CreatorAccessTest {
    @Test void missingCredentialsAreRejected() {
        var access = new CreatorAccess(new ObjectMapper(), "http://127.0.0.1:1");
        assertThatThrownBy(() -> access.require(new MockHttpServletRequest(), null)).isInstanceOf(ApiException.class).hasMessage("请先登录创作者账号");
    }
    @Test void cmsSessionsCannotAccessAppReviews() {
        var access = new CreatorAccess(new ObjectMapper(), "http://127.0.0.1:1");
        var admin = UsernamePasswordAuthenticationToken.authenticated("admin@example.com", null, List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
        assertThatThrownBy(() -> access.require(new MockHttpServletRequest(), admin)).isInstanceOf(ApiException.class);
        var editor = UsernamePasswordAuthenticationToken.authenticated("editor@example.com", null, List.of(new SimpleGrantedAuthority("content.write")));
        assertThatThrownBy(() -> access.require(new MockHttpServletRequest(), editor)).isInstanceOf(ApiException.class);
    }
    @Test void appIdentityComesFromVerifiedUpstreamNotCallerInput() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/user/userInfo", exchange -> {
            var valid = "test-valid-token".equals(exchange.getRequestHeaders().getFirst("token"));
            var body = (valid ? "{\"code\":1,\"data\":{\"userinfo\":{\"id\":42,\"username\":\"Writer\"}}}" : "{\"code\":0,\"msg\":\"expired\"}").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length); exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();
        try {
            var access = new CreatorAccess(new ObjectMapper(), "http://127.0.0.1:" + server.getAddress().getPort());
            var request = new MockHttpServletRequest(); request.addHeader("Authorization", "Bearer test-valid-token"); request.addHeader("X-User-Id", "999");
            var viewer = access.require(request, null);
            assertThat(viewer.ownerKey()).isEqualTo("app:42"); assertThat(viewer.admin()).isFalse();
            var invalid = new MockHttpServletRequest(); invalid.addHeader("Authorization", "Bearer expired");
            assertThatThrownBy(() -> access.require(invalid, null)).isInstanceOf(ApiException.class).hasMessage("请先登录创作者账号");
        } finally { server.stop(0); }
    }
}
