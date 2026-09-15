package com.mydream.cms.creator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/creator-api/v1")
public class CreatorEpisodeController {
    private final CreatorAccess access;private final CreatorEpisodeService service;private final CreatorAgreementService agreements;
    public CreatorEpisodeController(CreatorAccess access,CreatorEpisodeService service,CreatorAgreementService agreements){this.access=access;this.service=service;this.agreements=agreements;}
    @PostMapping("/projects/{id}/episodes/{submission}/edit-check") Object editable(@PathVariable String id,@PathVariable String submission,HttpServletRequest r,Authentication a){return service.editable(access.require(r,a),id,submission);}
    @PostMapping("/project-reviews/{id}/confirm-deletion") Object deleted(@PathVariable String id,@RequestBody CreatorEpisodeService.DeletionInput body,HttpServletRequest r,Authentication a){return service.confirmDeletion(access.require(r,a),id,body);}
    @GetMapping("/project-publications") Object publications(HttpServletRequest r,Authentication a){return service.publications(access.require(r,a));}
    @GetMapping("/project-episodes") Object mine(HttpServletRequest r,Authentication a){return service.mine(access.require(r,a));}
    @PostMapping("/project-reviews/{id}/complete") Object complete(@PathVariable String id,@Valid @RequestBody CreatorEpisodeService.CompleteInput body,HttpServletRequest r,Authentication a){return service.complete(access.require(r,a),id,body);}
    @GetMapping("/projects/{id}/episodes") Object detail(@PathVariable String id,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id,false);}
    @GetMapping("/project-reviews/{id}/episodes") Object reviewDetail(@PathVariable String id,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id,true);}
    @PostMapping("/projects/{id}/uploads") Object upload(@PathVariable String id,@Valid @RequestBody CreatorEpisodeService.UploadInput body,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);agreements.requireProject(viewer,id);return service.create(viewer,id,body,access.appAuthorization(r));}
    @PostMapping("/projects/{id}/episodes/{submission}/submit") Object submit(@PathVariable String id,@PathVariable String submission,@Valid @RequestBody CreatorEpisodeService.SubmitInput body,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);agreements.requireProject(viewer,id);return service.submit(viewer,id,submission,body);}
    @PostMapping("/projects/{id}/episodes/{submission}/draft") Object draft(@PathVariable String id,@PathVariable String submission,@Valid @RequestBody CreatorEpisodeService.SubmitInput body,HttpServletRequest r,Authentication a){return service.draft(access.require(r,a),id,submission,body);}
    @PostMapping("/projects/{id}/episodes/{submission}/metadata") Object metadata(@PathVariable String id,@PathVariable String submission,@Valid @RequestBody CreatorEpisodeService.SubmitInput body,HttpServletRequest r,Authentication a){return service.metadata(access.require(r,a),id,submission,body);}
    @PostMapping("/project-reviews/{id}/episodes/{submission}/review") Object review(@PathVariable String id,@PathVariable String submission,@Valid @RequestBody CreatorEpisodeService.ReviewInput body,HttpServletRequest r,Authentication a){return service.review(access.require(r,a),id,submission,body);}
    @PostMapping("/project-reviews/{id}/episodes/{submission}/publication") Object link(@PathVariable String id,@PathVariable String submission,@Valid @RequestBody CreatorEpisodeService.PublicationInput body,HttpServletRequest r,Authentication a){return service.link(access.require(r,a),id,submission,body);}
    @GetMapping("/projects/{id}/publication-check") Object check(@PathVariable String id,@RequestParam int episodeNumber,HttpServletRequest r,Authentication a){return service.check(access.require(r,a),id,false,episodeNumber);}
    @GetMapping("/project-reviews/{id}/publication-check") Object reviewCheck(@PathVariable String id,@RequestParam int episodeNumber,HttpServletRequest r,Authentication a){return service.check(access.require(r,a),id,true,episodeNumber);}
}
