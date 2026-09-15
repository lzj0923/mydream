package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class FormEmailNotificationMigrationTest {
    @Test
    void formSubmissionsTrackConfigurableEmailDelivery() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V12__form_email_notifications.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("cms_form_notification_setting");
            assertThat(sql).contains("recipient_email");
            assertThat(sql).contains("email_status");
            assertThat(sql).contains("email_sent_at");
            assertThat(sql).contains("business-contact");
        }
    }
}
