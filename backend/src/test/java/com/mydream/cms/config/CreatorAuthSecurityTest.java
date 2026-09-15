package com.mydream.cms.config;

import com.mydream.cms.identity.AdminUserDetailsService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CreatorAuthSecurityTest {
    @Test
    void anonymousLoginAndRegisterReachControllerWithoutAdminSessionOrCsrf() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            for (var action : new String[]{"login", "register"}) {
                mvc.perform(post("/creator-api/v1/auth/" + action))
                        .andExpect(status().isNoContent());
            }
        }
    }

    @Test
    void anonymousAdminAndNonBearerCreatorMutationsStillRequireCsrf() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            mvc.perform(post("/admin-api/v1/verification/review")).andExpect(status().isForbidden());
            mvc.perform(post("/creator-api/v1/verification")).andExpect(status().isForbidden());
        }
    }

    private AnnotationConfigWebApplicationContext context() {
        var context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(TestConfiguration.class);
        context.refresh();
        return context;
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfig.class, ProbeController.class, com.mydream.cms.shared.ApiExceptionHandler.class})
    static class TestConfiguration {
        @Bean ObjectMapper objectMapper() { return new ObjectMapper(); }
        @Bean AdminUserDetailsService users() { return mock(AdminUserDetailsService.class); }
        @Bean CmsProperties properties() {
            var properties = mock(CmsProperties.class);
            when(properties.allowedOrigins()).thenReturn(java.util.List.of("https://official.mydream.tw"));
            return properties;
        }
    }

    @RestController
    static class ProbeController {
        @org.springframework.web.bind.annotation.GetMapping("/creator-api/v1/notifications")
        ResponseEntity<Void> notifications() {
            throw new org.springframework.dao.DataAccessResourceFailureException("private database diagnostic");
        }
        @PostMapping({"/creator-api/v1/auth/login", "/creator-api/v1/auth/register"})
        ResponseEntity<Void> auth() { return ResponseEntity.noContent().build(); }
    }

    @Test void databaseFailureIsServiceErrorWithoutLeakingSqlOrRequiringAdminLogin() throws Exception {
        try (var context = context()) {
            var mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/creator-api/v1/notifications"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code").value("DATA_SERVICE_UNAVAILABLE"))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private database diagnostic"))));
        }
    }
}
