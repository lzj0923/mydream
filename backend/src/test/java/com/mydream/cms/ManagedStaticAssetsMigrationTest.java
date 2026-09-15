package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ManagedStaticAssetsMigrationTest {
    @Test
    void migrationCreatesAliasesAndRewritesLegacyAssetUrls() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V6__managed_static_assets.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("CREATE TABLE cms_media_alias");
            assertThat(sql).contains("UNIQUE KEY uk_media_alias_site_key");
            assertThat(sql).contains("cms_page_block");
            assertThat(sql).contains("cms_content_version");
            assertThat(sql).contains("cms_site_config_version");
            assertThat(sql).contains("\"/cms-media/assets/");
        }
    }
}
