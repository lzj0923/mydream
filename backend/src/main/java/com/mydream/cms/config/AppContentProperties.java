package com.mydream.cms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cms.app-content")
public record AppContentProperties(
        boolean enabled,
        boolean writeEnabled,
        String databaseUrl,
        String username,
        String password,
        String publicBaseUrl
) {
    public AppContentProperties {
        databaseUrl = databaseUrl == null ? "" : databaseUrl.trim();
        username = username == null ? "" : username;
        password = password == null ? "" : password;
        publicBaseUrl = publicBaseUrl == null ? "" : publicBaseUrl.trim().replaceAll("/$", "");
    }
}
