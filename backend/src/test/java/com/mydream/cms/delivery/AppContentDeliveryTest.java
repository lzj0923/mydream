package com.mydream.cms.delivery;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AppContentDeliveryTest {
    @Test
    void prefixesRelativeAppMediaUrls() {
        assertThat(AppContentDelivery.externalUrl("https://new-mydream.oss-cn-hongkong.aliyuncs.com/", "/uploads/cover.webp"))
                .isEqualTo("https://new-mydream.oss-cn-hongkong.aliyuncs.com/uploads/cover.webp");
    }

    @Test
    void preservesAbsoluteObjectStorageUrls() {
        assertThat(AppContentDelivery.externalUrl("https://app.example.com", "https://cdn.example.com/video.mp4"))
                .isEqualTo("https://cdn.example.com/video.mp4");
    }

    @Test
    void preservesRelativePathWhenNoPublicBaseUrlIsConfigured() {
        assertThat(AppContentDelivery.externalUrl("", "/uploads/cover.webp"))
                .isEqualTo("/uploads/cover.webp");
    }
}
