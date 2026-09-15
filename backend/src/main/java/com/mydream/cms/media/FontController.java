package com.mydream.cms.media;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin-api/v1/sites/{siteId}/fonts")
public class FontController {
    private final FontService fonts;

    public FontController(FontService fonts) {
        this.fonts = fonts;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('site.read')")
    public List<FontService.FontView> list(@PathVariable String siteId) {
        return fonts.list(siteId);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('site.write')")
    public FontService.FontView create(@PathVariable String siteId,
                                       @Valid @RequestBody FontService.CreateFontRequest request) {
        return fonts.create(siteId, request);
    }

    @PostMapping("/{fontId}/faces")
    @PreAuthorize("hasAuthority('site.write')")
    public FontService.FontView addFace(@PathVariable String siteId, @PathVariable String fontId,
                                        @Valid @RequestBody FontService.AddFaceRequest request) {
        return fonts.addFace(siteId, fontId, request);
    }
}
