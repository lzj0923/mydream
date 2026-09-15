package com.mydream.cms.identity;

import com.mydream.cms.shared.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class AuthControllerTest {
    @Test void cmsSessionWorksWithoutAppSessionAndIgnoresInvalidAppCookie() {
        var manager=mock(AuthenticationManager.class);
        var auth=org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated("cms-test@example.invalid",null,java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));
        when(manager.authenticate(any())).thenReturn(auth);
        var controller=new AuthController(manager);
        try {
            for(boolean appCookie:new boolean[]{false,true}) {
                var request=new MockHttpServletRequest();
                if(appCookie)request.setCookies(new jakarta.servlet.http.Cookie("md_app_admin","invalid-app-session"));
                var view=controller.login(new AuthController.LoginRequest("cms-test@example.invalid","synthetic"),request,new MockHttpServletResponse());
                assertThat(view.email()).isEqualTo("cms-test@example.invalid");
                var context=(org.springframework.security.core.context.SecurityContext)request.getSession(false).getAttribute("SPRING_SECURITY_CONTEXT");
                assertThat(context.getAuthentication().isAuthenticated()).isTrue();
                assertThat(controller.me(context.getAuthentication()).email()).isEqualTo(view.email());
                controller.logout(request);
                assertThat(request.getSession(false)).isNull();
            }
        }finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }
    @Test void failedLoginExplainsCredentialsInsteadOfAskingToLoginAgain() {
        var manager=mock(AuthenticationManager.class);
        var controller=new AuthController(manager);
        for(var failure:new org.springframework.security.core.AuthenticationException[]{new BadCredentialsException("bad"),new DisabledException("disabled")}) {
            doThrow(failure).when(manager).authenticate(any());
            var request=new MockHttpServletRequest();
            assertThatThrownBy(()->controller.login(new AuthController.LoginRequest("test@example.invalid","synthetic"),request,new MockHttpServletResponse()))
                    .isInstanceOfSatisfying(ApiException.class,e->{assertThat(e.status().value()).isEqualTo(401);assertThat(e.code()).isEqualTo("INVALID_CREDENTIALS");assertThat(e.getMessage()).contains("郵箱或密碼");});
            assertThat(request.getSession(false)).isNull();
        }
    }
}
