package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class WorkEpisodeMigrationTest {
    @Test
    void episodesAreIndependentContentRelatedToAWorkAndVideoMedia() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V8__work_episode_content.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("'episode'");
            assertThat(sql).contains("'episode-of'");
            assertThat(sql).contains("'videoMediaId'");
            assertThat(sql).contains("cms_content_relation");
            assertThat(sql).contains("cms_release_content");
        }
    }
}
