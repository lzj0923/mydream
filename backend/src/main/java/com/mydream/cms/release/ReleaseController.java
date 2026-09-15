package com.mydream.cms.release;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin-api/v1")
public class ReleaseController {
    private final ReleaseService releases;

    public ReleaseController(ReleaseService releases) {
        this.releases = releases;
    }

    @GetMapping("/sites/{siteId}/releases")
    @PreAuthorize("hasAuthority('site.read')")
    public List<ReleaseService.ReleaseView> list(@PathVariable String siteId) {
        return releases.list(siteId);
    }

    @PostMapping("/sites/{siteId}/releases")
    @PreAuthorize("hasAuthority('release.publish')")
    public ReleaseService.ReleaseView publish(@PathVariable String siteId,
                                               @Valid @RequestBody(required = false) ReleaseService.PublishRequest request,
                                               Authentication authentication) {
        return releases.publish(siteId, request, authentication);
    }

    @PostMapping("/releases/{releaseId}/activate")
    @PreAuthorize("hasAuthority('release.publish')")
    public ReleaseService.ReleaseView activate(@PathVariable String releaseId, Authentication authentication) {
        return releases.activate(releaseId, authentication);
    }
}
