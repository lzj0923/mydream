package com.mydream.cms.creator;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/creator-api/v1/team/work-type")
public class CreatorWorkTypeController {
 private final CreatorAccountService accounts;private final CreatorWorkTypeService types;
 public CreatorWorkTypeController(CreatorAccountService a,CreatorWorkTypeService t){accounts=a;types=t;}
 public record Selection(String workType){}
 @GetMapping Object current(HttpServletRequest r){return types.status(accounts.require(CreatorAccountController.token(r)).id());}
 @PostMapping Object select(@RequestBody Selection s,HttpServletRequest r){return types.select(accounts.require(CreatorAccountController.token(r)).id(),s.workType());}
}
