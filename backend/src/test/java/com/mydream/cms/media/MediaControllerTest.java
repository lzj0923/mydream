package com.mydream.cms.media;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class MediaControllerTest {
    @Test
    void servesImportedMediaStoredBelowManagedDirectory() throws Exception {
        var media = mock(MediaService.class);
        var bytes = "svg".getBytes(StandardCharsets.UTF_8);
        when(media.stored("site-id/managed/window.svg")).thenReturn(new MediaService.StoredMedia(
                "window.svg", "image/svg+xml", bytes.length, new ByteArrayResource(bytes)));
        var mvc = MockMvcBuilders.standaloneSetup(new MediaController(media)).build();

        mvc.perform(get("/media/site-id/managed/window.svg"))
                .andExpect(status().isOk());

        verify(media).stored("site-id/managed/window.svg");
    }
}
