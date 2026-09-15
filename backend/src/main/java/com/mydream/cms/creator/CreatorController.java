package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/creator-api/v1")
public class CreatorController {
    private final CreatorAccess access;
    private final CreatorService service;
    private final CreatorAgreementService agreements;
    public CreatorController(CreatorAccess access, CreatorService service, CreatorAgreementService agreements) { this.access = access; this.service = service; this.agreements=agreements; }
    @GetMapping("/workspace")
    Object workspace(HttpServletRequest r, Authentication a) { var result=new java.util.LinkedHashMap<>(service.workspace(access.require(r,a)));if(Boolean.FALSE.equals(r.getAttribute("team-cooperation-view")))result.put("interests",java.util.List.of());return result; }
    @GetMapping("/scripts/{id}")
    Object detail(@PathVariable String id, HttpServletRequest r, Authentication a) { return service.detail(access.require(r,a),id); }
    @PostMapping("/scripts")
    Object create(@Valid @RequestBody CreatorService.ScriptInput body, HttpServletRequest r, Authentication a) { var viewer=access.require(r,a); return service.create(viewer,body); }
    @PutMapping("/scripts/{id}")
    Object update(@PathVariable String id, @Valid @RequestBody CreatorService.ScriptInput body, HttpServletRequest r, Authentication a) { var viewer=access.require(r,a); return service.update(viewer,id,body); }
    @PostMapping("/scripts/{id}/submit")
    Object submit(@PathVariable String id, @Valid @RequestBody CreatorService.VersionInput body, HttpServletRequest r, Authentication a) { var viewer=access.require(r,a); return service.submit(viewer,id,body.version()); }
    @PostMapping("/scripts/{id}/withdraw")
    Object withdraw(@PathVariable String id, @Valid @RequestBody CreatorService.VersionInput body, HttpServletRequest r, Authentication a) { return service.withdraw(access.require(r,a),id,body.version()); }
    @PutMapping("/profile")
    Object profile(@Valid @RequestBody CreatorService.ProfileInput body, HttpServletRequest r, Authentication a) { return service.profile(access.require(r,a),body); }
    @GetMapping("/reviews")
    Object reviews(HttpServletRequest r, Authentication a) { admin(r,a); return service.reviews(); }
    @PostMapping("/reviews/{id}")
    Object review(@PathVariable String id, @Valid @RequestBody CreatorService.ReviewInput body, HttpServletRequest r, Authentication a) { return service.review(admin(r,a),id,body); }
    private CreatorAccess.Viewer admin(HttpServletRequest r, Authentication a) {
        var viewer = access.require(r,a);
        if (!viewer.admin()) throw new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","仅平台管理员可以审核投稿");
        return viewer;
    }
    @PostMapping("/interests")
    Object interest(@Valid @RequestBody CreatorService.InterestInput body, HttpServletRequest r, Authentication a) { var viewer=access.require(r,a); agreements.requireMembership(viewer); return service.interest(viewer,body); }
    @PutMapping("/favorites")
    Object favorite(@Valid @RequestBody CreatorService.FavoriteInput body, HttpServletRequest r, Authentication a) { return service.favorite(access.require(r,a),body); }
    @GetMapping("/interest-reviews")
    Object interestReviews(HttpServletRequest r, Authentication a) { admin(r,a); return service.interestReviews(); }
    @PostMapping("/interest-reviews/{id}")
    Object reviewInterest(@PathVariable String id, @Valid @RequestBody CreatorService.ReviewInput body, HttpServletRequest r, Authentication a) { admin(r,a); return service.reviewInterest(id,body); }
}
