package com.mydream.cms.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mydream.cms.shared.ApiException;
import org.junit.jupiter.api.Test;

class MediaAliasTest {
    @Test
    void normalizesBrowserAndWindowsPaths() {
        assertThat(MediaService.normalizeAlias("/assets/v2/logo.png")).isEqualTo("assets/v2/logo.png");
        assertThat(MediaService.normalizeAlias("prototype\\jyg\\cover.webp")).isEqualTo("prototype/jyg/cover.webp");
    }

    @Test
    void rejectsTraversalAndMalformedAliases() {
        assertThatThrownBy(() -> MediaService.normalizeAlias("../secret.png")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> MediaService.normalizeAlias("assets//logo.png")).isInstanceOf(ApiException.class);
    }
}
