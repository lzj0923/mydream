package com.mydream.cms.studio;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin-api/v1")
public class StudioController {
    private final StudioFacade studio;

    public StudioController(StudioFacade studio) {
        this.studio = studio;
    }

    @GetMapping("/sites/{siteId}/pages")
    @PreAuthorize("hasAuthority('page.read')")
    public List<StudioModels.PageSummary> pages(@PathVariable String siteId) {
        return studio.listPages(siteId);
    }

    @PostMapping("/sites/{siteId}/pages")
    @PreAuthorize("hasAuthority('page.write')")
    public StudioModels.PageDraft createPage(@PathVariable String siteId,
                                              @Valid @RequestBody StudioModels.CreatePageRequest request,
                                              Authentication authentication) {
        return studio.createPage(siteId, request, authentication);
    }

    @GetMapping("/pages/{pageId}")
    @PreAuthorize("hasAuthority('page.read')")
    public StudioModels.PageDraft page(@PathVariable String pageId) {
        return studio.page(pageId);
    }

    @PutMapping("/pages/{pageId}")
    @PreAuthorize("hasAuthority('page.write')")
    public StudioModels.PageDraft savePage(@PathVariable String pageId,
                                            @Valid @RequestBody StudioModels.SavePageRequest request,
                                            Authentication authentication) {
        return studio.savePage(pageId, request, authentication);
    }

    @GetMapping("/sites/{siteId}/content")
    @PreAuthorize("hasAuthority('content.read')")
    public List<StudioModels.ContentSummary> content(@PathVariable String siteId,
                                                      @RequestParam(required = false) String type) {
        return studio.listContent(siteId, type);
    }

    @PostMapping("/sites/{siteId}/content")
    @PreAuthorize("hasAuthority('content.write')")
    public StudioModels.ContentDraft createContent(@PathVariable String siteId,
                                                    @Valid @RequestBody StudioModels.CreateContentRequest request,
                                                    Authentication authentication) {
        return studio.createContent(siteId, request, authentication);
    }

    @GetMapping("/content/{contentId}")
    @PreAuthorize("hasAuthority('content.read')")
    public StudioModels.ContentDraft content(@PathVariable String contentId) {
        return studio.content(contentId);
    }

    @PutMapping("/content/{contentId}")
    @PreAuthorize("hasAuthority('content.write')")
    public StudioModels.ContentDraft saveContent(@PathVariable String contentId,
                                                  @Valid @RequestBody StudioModels.SaveContentRequest request,
                                                  Authentication authentication) {
        return studio.saveContent(contentId, request, authentication);
    }

    @DeleteMapping("/content/{contentId}")
    @PreAuthorize("hasAuthority('content.write')")
    public ResponseEntity<Void> deleteContent(@PathVariable String contentId,
                                               @RequestParam int lockVersion,
                                               Authentication authentication) {
        studio.archiveContent(contentId, lockVersion, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sites/{siteId}/config")
    @PreAuthorize("hasAuthority('site.read')")
    public StudioModels.JsonDraft siteConfig(@PathVariable String siteId) {
        return studio.siteConfig(siteId);
    }

    @PutMapping("/sites/{siteId}/config")
    @PreAuthorize("hasAuthority('site.write')")
    public StudioModels.JsonDraft saveSiteConfig(@PathVariable String siteId,
                                                  @Valid @RequestBody StudioModels.SaveJsonDraftRequest request,
                                                  Authentication authentication) {
        return studio.saveSiteConfig(siteId, request, authentication);
    }

    @GetMapping("/themes/{themeId}")
    @PreAuthorize("hasAuthority('site.read')")
    public StudioModels.JsonDraft theme(@PathVariable String themeId) {
        return studio.theme(themeId);
    }

    @PutMapping("/themes/{themeId}")
    @PreAuthorize("hasAuthority('site.write')")
    public StudioModels.JsonDraft saveTheme(@PathVariable String themeId,
                                             @Valid @RequestBody StudioModels.SaveJsonDraftRequest request,
                                             Authentication authentication) {
        return studio.saveTheme(themeId, request, authentication);
    }

    @GetMapping("/navigations/{navigationId}")
    @PreAuthorize("hasAuthority('site.read')")
    public StudioModels.NavigationDraft navigation(@PathVariable String navigationId) {
        return studio.navigation(navigationId);
    }

    @PutMapping("/navigations/{navigationId}")
    @PreAuthorize("hasAuthority('site.write')")
    public StudioModels.NavigationDraft saveNavigation(@PathVariable String navigationId,
                                                        @Valid @RequestBody StudioModels.SaveNavigationRequest request,
                                                        Authentication authentication) {
        return studio.saveNavigation(navigationId, request, authentication);
    }
}
