package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class MediaDisplayNameMigrationTest {
    @Test
    void migrationPreservesOriginalFileNameAndAddsEditableDisplayName() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V5__media_display_name.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("ADD COLUMN display_name");
            assertThat(sql).contains("SET display_name = original_name");
        }
    }
}
