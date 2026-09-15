package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class AiCreationCenterMigrationTest {
    @Test
    void updatesOnlyTheUniverseDefaultsWithoutReplacingCustomHeroArtwork() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V19__ai_creation_center_layout.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("page_row.path = '/universe'");
            assertThat(sql).contains("AI 創作中心");
            assertThat(sql).contains("/cms-media/assets/jyg/ai-creation-center-hero-v1.png");
            assertThat(sql).contains("COALESCE(JSON_UNQUOTE(JSON_EXTRACT(block_row.props_json, '$.backgroundUrl')), '') IN");
            assertThat(sql).contains("block_row.zone_key = 'content'");
        }
    }
}
