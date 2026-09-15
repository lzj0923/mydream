package com.mydream.cms.delivery;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SiteDeliveryTest {
    @Test
    void allowsTheFrontendToRequestAllManagedEpisodes() {
        assertThat(SiteDelivery.normalizeContentLimit(500)).isEqualTo(500);
    }

    @Test
    void keepsContentLimitWithinSafeBounds() {
        assertThat(SiteDelivery.normalizeContentLimit(0)).isEqualTo(1);
        assertThat(SiteDelivery.normalizeContentLimit(501)).isEqualTo(500);
    }
}
