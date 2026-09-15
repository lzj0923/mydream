package com.mydream.cms.identity;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.mydream.cms.config.CmsProperties;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminBootstrapTest {
    @Test
    void createsConfiguredAdministratorAndAssignsSuperAdminRole() {
        var jdbc = mock(JdbcTemplate.class);
        var encoder = mock(PasswordEncoder.class);
        var properties = mock(CmsProperties.class);
        var arguments = mock(ApplicationArguments.class);

        when(properties.bootstrapAdminEmail()).thenReturn(" Admin@MyDream.Local ");
        when(properties.bootstrapAdminPassword()).thenReturn("temporary-secret");
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq("admin@mydream.local"))).thenReturn(0);
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq("admin@mydream.local"))).thenReturn(42L);
        when(encoder.encode("temporary-secret")).thenReturn("encoded-secret");

        new AdminBootstrap(jdbc, encoder, properties).run(arguments);

        verify(jdbc).update(
                contains("INSERT INTO cms_admin_user"),
                anyString(),
                eq("admin@mydream.local"),
                eq("encoded-secret"),
                eq("Bootstrap Admin"));
        verify(jdbc).update(contains("INSERT INTO cms_user_role"), eq(42L));
    }

    @Test
    void doesNothingWhenBootstrapCredentialsAreNotConfigured() {
        var jdbc = mock(JdbcTemplate.class);
        var encoder = mock(PasswordEncoder.class);
        var properties = mock(CmsProperties.class);

        new AdminBootstrap(jdbc, encoder, properties).run(mock(ApplicationArguments.class));

        verifyNoInteractions(jdbc, encoder);
    }
}
