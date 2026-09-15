package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class AboutShowcaseMigrationTest {
    @Test
    void aboutPageUsesFiveManagedZonesAndDatabaseMediaReferences() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V9__about_showcase.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("'hero',0").contains("'story',1").contains("'platform',2");
            assertThat(sql).contains("'join',3").contains("'banner',4");
            assertThat(sql).contains("'backgroundMediaId'");
            assertThat(sql).contains("'cardOneImageMediaId'").contains("'cardThreeImageMediaId'");
            assertThat(sql).contains("cms_release_page");
        }
    }
}
