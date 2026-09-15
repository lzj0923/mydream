package com.mydream.cms.creator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/creator-api/v1")
public class CreatorAgreementController {
    private final CreatorAccess access;private final CreatorAgreementService service;
    public CreatorAgreementController(CreatorAccess access,CreatorAgreementService service){this.access=access;this.service=service;}
    @GetMapping("/contracts") Object mine(HttpServletRequest r,Authentication a){return service.list(access.require(r,a),false);}
    @PostMapping("/contracts") Object submit(@Valid @RequestBody CreatorAgreementService.SubmitInput input,HttpServletRequest r,Authentication a){return service.submit(access.require(r,a),input);}
    @PostMapping("/contracts/check") Object check(HttpServletRequest r,Authentication a){service.requireMembership(access.require(r,a));return java.util.Map.of("ok",true);}
    @GetMapping("/contract-reviews") Object reviews(HttpServletRequest r,Authentication a){return service.list(access.require(r,a),true);}
    @PostMapping("/contract-reviews/{id}") Object review(@PathVariable String id,@Valid @RequestBody CreatorAgreementService.ReviewInput input,HttpServletRequest r,Authentication a){return service.review(access.require(r,a),id,input);}
    @PutMapping("/contract-templates/{kind}") Object template(@PathVariable String kind,@Valid @RequestBody CreatorAgreementService.TemplateInput input,HttpServletRequest r,Authentication a){return service.template(access.require(r,a),kind,input);}
}
