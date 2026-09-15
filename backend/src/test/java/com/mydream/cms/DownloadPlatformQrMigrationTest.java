package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class DownloadPlatformQrMigrationTest {
    @Test
    void downloadPageKeepsSeparateAndroidAndIosMediaReferences() throws Exception {
        try (var stream = getClass().getResourceAsStream("/db/migration/V7__download_platform_qr_panels.sql")) {
            assertThat(stream).isNotNull();
            var sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("'/download','download'");
            assertThat(sql).contains("'androidQrMediaId','64ad7e29-0fa9-33d8-8ff9-3b42eb342ae8'");
            assertThat(sql).contains("'iosQrMediaId','58aaf607-07ba-3d6b-aaa2-8645b1787f64'");
            assertThat(sql).contains("'store-status'");
        }
    }
}
