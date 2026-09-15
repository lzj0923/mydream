package com.mydream.cms.creator;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/creator-api/v1")
public class CreatorVerificationController {
 private final CreatorAccess access;private final CreatorVerificationService service;
 public CreatorVerificationController(CreatorAccess access,CreatorVerificationService service){this.access=access;this.service=service;}
 @GetMapping("/verification") Object mine(HttpServletRequest r,Authentication a){return service.status(access.require(r,a));}
 @PostMapping("/verification") Object submit(@RequestBody CreatorVerificationService.Input input,HttpServletRequest r,Authentication a){return service.submit(access.require(r,a),input);}
 @PostMapping("/verification/check") Object check(HttpServletRequest r,Authentication a){service.requireApproved(access.require(r,a));return java.util.Map.of("ok",true);}
 @GetMapping("/verification-reviews") Object list(HttpServletRequest r,Authentication a){return service.list(access.require(r,a));}
 @GetMapping("/verification-reviews/{id}") Object detail(@PathVariable String id,HttpServletRequest r,Authentication a){return service.detail(access.require(r,a),id);}
 @PostMapping("/verification-reviews/{id}") Object review(@PathVariable String id,@RequestBody CreatorVerificationService.Decision input,HttpServletRequest r,Authentication a){return service.review(access.require(r,a),id,input);}
}
