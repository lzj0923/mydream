package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class FixedHomeMigrationTest {
    @Test
    void migrationDoesNotUseReleaseReservedWordAsTableAlias() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V3__fixed_home_tuning_and_works.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).doesNotContain("FROM cms_site_release release");
            assertThat(sql).contains("FROM cms_site_release site_release");
        }
    }
}
