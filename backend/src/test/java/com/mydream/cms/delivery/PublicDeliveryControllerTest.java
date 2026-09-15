package com.mydream.cms.delivery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class PublicDeliveryControllerTest {
    @Test
    void shellDisablesCachingSoFooterChangesAreVisibleImmediately() {
        var delivery = mock(SiteDelivery.class);
        var shell = mock(DeliveryModels.SiteShell.class);
        when(shell.releaseId()).thenReturn("release-2");
        when(delivery.shell("mydream")).thenReturn(shell);

        var response = new PublicDeliveryController(delivery).shell("mydream");

        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
        assertThat(response.getHeaders().getFirst("X-Release-Id")).isEqualTo("release-2");
    }
}
