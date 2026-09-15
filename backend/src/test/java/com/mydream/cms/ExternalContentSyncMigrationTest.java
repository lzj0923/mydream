package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ExternalContentSyncMigrationTest {
    @Test
    void migrationTracksSourceIdentityHashAndSyncTime() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V24__external_content_sync.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("cms_external_content_sync");
            assertThat(sql).contains("source_system").contains("source_id");
            assertThat(sql).contains("source_hash").contains("last_synced_at");
            assertThat(sql).contains("UNIQUE KEY uk_external_content_entry");
        }
    }
}
