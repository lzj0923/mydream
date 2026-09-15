package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class AboutActionsMigrationTest {
    @Test
    void actionsAndAllFourBenefitsAreManaged() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V10__about_actions_and_benefits.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("$.actionLabel").contains("$.actionHref");
            assertThat(sql).contains("$.benefitOneTitle").contains("$.benefitFourDescription");
            assertThat(sql).contains("block.zone_key='join'");
        }
    }
}
