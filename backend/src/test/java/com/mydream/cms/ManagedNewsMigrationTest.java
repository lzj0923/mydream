package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ManagedNewsMigrationTest {
    @Test
    void existingNewsBecomesManagedStructuredSeoContent() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V11__managed_news_articles.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("'article'");
            assertThat(sql).contains("'bodyBlocks'");
            assertThat(sql).contains("\"type\":\"heading1\"").contains("\"type\":\"heading2\"");
            assertThat(sql).contains("'seo'").contains("'canonicalPath'").contains("'ogImageMediaId'");
            assertThat(sql).contains("cms_release_content");
            assertThat(sql).contains("my-dream-ai-drama-app-launch-event");
        }
    }
}
