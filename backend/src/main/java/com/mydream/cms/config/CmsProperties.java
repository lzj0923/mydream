package com.mydream.cms.config;

import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cms")
public record CmsProperties(
        String publicBaseUrl,
        Path uploadDirectory,
        List<String> allowedOrigins,
        String bootstrapAdminEmail,
        String bootstrapAdminPassword,
        String piiKeyBase64,
        String previewSecret,
        Path legacyAssetDirectory,
        String legacyAssetSiteKey,
        String mailFrom
) {
    public CmsProperties {
        allowedOrigins = allowedOrigins == null ? List.of("http://localhost:3000") : List.copyOf(allowedOrigins);
        uploadDirectory = uploadDirectory == null ? Path.of("./data/uploads") : uploadDirectory;
        legacyAssetDirectory = legacyAssetDirectory == null ? Path.of("../public") : legacyAssetDirectory;
        legacyAssetSiteKey = legacyAssetSiteKey == null || legacyAssetSiteKey.isBlank() ? "mydream" : legacyAssetSiteKey;
    }
}
