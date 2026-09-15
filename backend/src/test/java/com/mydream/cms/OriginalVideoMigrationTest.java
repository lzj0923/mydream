package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class OriginalVideoMigrationTest {
    @Test
    void originalVideosAreIndependentFromWorkEpisodesAndUseManagedMedia() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V13__original_video_content.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("'original-video'");
            assertThat(sql).contains("'star-traveler'").contains("'endless-realm'");
            assertThat(sql).contains("'videoMediaId'");
            assertThat(sql).contains("cms_release_content");
            assertThat(sql).doesNotContain("'episode-of'");
        }
    }
}
