package com.mydream.cms.creator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/creator-api/v1")
public class CreatorProductionController {
    private final CreatorAccess access;private final CreatorProductionService service;private final CreatorAgreementService agreements;
    public CreatorProductionController(CreatorAccess access,CreatorProductionService service,CreatorAgreementService agreements){this.access=access;this.service=service;this.agreements=agreements;}
    static boolean member(HttpServletRequest r){return r.getAttribute("team-owner")!=null&&!r.getAttribute("team-owner").equals(r.getAttribute("team-actor"));}
    @PostMapping("/projects") Object create(@Valid @RequestBody CreatorProductionService.ProjectInput body,HttpServletRequest r,Authentication a){if(member(r)&&(body.settings()==null||body.settings().price()==null||body.settings().price().signum()!=0))throw CreatorTeamService.denied();return service.create(access.require(r,a),body);}
    @PutMapping("/projects/{id}/settings") Object settings(@PathVariable String id,@RequestBody CreatorProductionService.Settings body,HttpServletRequest r,Authentication a){if(member(r)){var current=(java.util.Map<?,?>)service.detail(access.require(r,a),id,false).get("settings");if(current==null||body==null||body.price()==null||!java.util.Objects.equals(current.get("area"),body.area())||new java.math.BigDecimal(current.get("price").toString()).compareTo(body.price())!=0)throw CreatorTeamService.denied();}return service.settings(access.require(r,a),id,body);}
    @GetMapping("/projects") Object projects(HttpServletRequest r,Authentication a){return service.list(access.require(r,a),false);}
    @PutMapping("/projects/{id}/content") Object content(@PathVariable String id,@RequestBody CreatorProductionService.ContentInput body,HttpServletRequest r,Authentication a){return service.content(access.require(r,a),id,body);}
    @GetMapping("/projects/{id}") Object project(@PathVariable String id,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id,false);}
    @PostMapping("/projects/{id}/delivery") Object deliver(@PathVariable String id,@Valid @RequestBody CreatorProductionService.DeliveryInput body,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);agreements.requireProject(viewer,id);return service.deliver(viewer,id,body,access.appAuthorization(r));}
    @GetMapping("/project-reviews") Object projectsAdmin(HttpServletRequest r,Authentication a){return service.list(access.require(r,a),true);}
    @GetMapping("/project-reviews/{id}") Object projectAdmin(@PathVariable String id,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id,true);}
    @PutMapping("/project-reviews/{id}") Object progress(@PathVariable String id,@Valid @RequestBody CreatorProductionService.ProgressInput body,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);CreatorProductionService.requireAdmin(viewer);agreements.requireProject(viewer,id);return service.progress(viewer,id,body);}
}
