package com.mydream.cms.studio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

class StudioControllerTest {
    @Test
    void deleteContentArchivesTheRequestedVersion() {
        var studio = mock(StudioFacade.class);
        var authentication = mock(Authentication.class);
        var response = new StudioController(studio).deleteContent("work-id", 4, authentication);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(studio).archiveContent("work-id", 4, authentication);
    }
}
