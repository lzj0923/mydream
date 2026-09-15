package com.mydream.cms.creator;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/creator-api/v1")
public class CreatorRemovalController {
    private final CreatorAccess access; private final CreatorRemovalService service;
    public CreatorRemovalController(CreatorAccess access,CreatorRemovalService service){this.access=access;this.service=service;}
    @GetMapping("/project-reviews/removals") Object queue(HttpServletRequest r,Authentication a){return service.queue(access.require(r,a));}
    @GetMapping("/projects/{id}/removal") Object project(@PathVariable String id,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id,"",false);}
    @PostMapping("/projects/{id}/removal") Object change(@PathVariable String id,@Valid @RequestBody CreatorRemovalService.Input body,HttpServletRequest r,Authentication a){return service.change(access.require(r,a),id,"",body);}
    @GetMapping("/projects/{id}/episodes/{submission}/removal") Object episode(@PathVariable String id,@PathVariable String submission,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id,submission,false);}
    @PostMapping("/projects/{id}/episodes/{submission}/removal") Object changeEpisode(@PathVariable String id,@PathVariable String submission,@Valid @RequestBody CreatorRemovalService.Input body,HttpServletRequest r,Authentication a){return service.change(access.require(r,a),id,submission,body);}
    @GetMapping("/project-reviews/{id}/removal") Object admin(@PathVariable String id,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id,"",true);}
    @PostMapping("/project-reviews/{id}/removal/{requestId}") Object review(@PathVariable String id,@PathVariable String requestId,@Valid @RequestBody CreatorRemovalService.Input body,HttpServletRequest r,Authentication a){return service.review(access.require(r,a),id,requestId,body);}
}
