package com.mydream.cms.media;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class MediaController {
    private final MediaService media;

    public MediaController(MediaService media) {
        this.media = media;
    }

    @GetMapping("/admin-api/v1/sites/{siteId}/media")
    @PreAuthorize("hasAuthority('media.read')")
    public List<MediaService.MediaView> list(@PathVariable String siteId) {
        return media.list(siteId);
    }

    @PostMapping(path = "/admin-api/v1/sites/{siteId}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('media.write')")
    public MediaService.MediaView upload(@PathVariable String siteId, @RequestParam MultipartFile file,
                                         @RequestParam(required = false) String name,
                                         @RequestParam(required = false) String altText,
                                         @RequestParam(required = false) String caption,
                                         Authentication authentication) {
        return media.upload(siteId, file, name, altText, caption, authentication);
    }

    @PatchMapping("/admin-api/v1/media/{mediaId}")
    @PreAuthorize("hasAuthority('media.write')")
    public MediaService.MediaView update(@PathVariable String mediaId,
                                         @RequestBody MediaService.UpdateMediaRequest request) {
        return media.update(mediaId, request);
    }

    @DeleteMapping("/admin-api/v1/media/{mediaId}")
    @PreAuthorize("hasAuthority('media.write')")
    public ResponseEntity<Void> archive(@PathVariable String mediaId) {
        media.archive(mediaId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/media/{*storageKey}")
    public ResponseEntity<org.springframework.core.io.Resource> serve(@PathVariable String storageKey) {
        return mediaResponse(media.stored(MediaService.normalizeAlias(storageKey)));
    }

    @GetMapping("/public-api/v1/sites/{siteKey}/assets/{*alias}")
    public ResponseEntity<org.springframework.core.io.Resource> serveAlias(@PathVariable String siteKey,
                                                                          @PathVariable String alias) {
        return mediaResponse(media.storedAlias(siteKey, alias));
    }

    private ResponseEntity<org.springframework.core.io.Resource> mediaResponse(MediaService.StoredMedia value) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .contentLength(value.size())
                .contentType(MediaType.parseMediaType(value.mimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(value.originalName(), StandardCharsets.UTF_8).build().toString())
                .body(value.resource());
    }
}
