package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class AppMediaUrlMigrationTest {
    @Test
    void resolvesVodPlaceholdersFromAttachmentsWithoutExposingPaidEpisodes() throws Exception {
        var sql = migrationSql();

        assertThat(sql).contains("video_attachment.sha1 = episode.video_attachment_id");
        assertThat(sql).contains("NULLIF(video_attachment.vod_source_url, '')");
        assertThat(sql).contains("CASE WHEN episode.unlock_price = 0");
        assertThat(sql).contains("ELSE NULL END");
        assertThat(sql).contains("video_attachment.sha1 = video.video_attachment_id");
    }

    private String migrationSql() throws Exception {
        var candidates = new Path[] {
                Path.of("database/app/V2__web_media_urls.sql"),
                Path.of("../database/app/V2__web_media_urls.sql")
        };
        for (var candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                return Files.readString(candidate, StandardCharsets.UTF_8);
            }
        }
        throw new IllegalStateException("找不到 App 媒体地址迁移脚本");
    }
}
