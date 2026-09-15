package com.mydream.cms.creator;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/creator-api/v1/team")
public class CreatorTeamController {
 private final CreatorAccountService accounts;private final CreatorTeamService teams;
 public CreatorTeamController(CreatorAccountService accounts,CreatorTeamService teams){this.accounts=accounts;this.teams=teams;}
 String actor(HttpServletRequest r){return accounts.require(CreatorAccountController.token(r)).id();}
 @GetMapping Object get(HttpServletRequest r){return teams.status(actor(r));}
 @PostMapping("/invite") Object invite(@RequestBody CreatorTeamService.Invite i,HttpServletRequest r){return teams.invite(actor(r),i);}
 @PostMapping("/member") Object member(@RequestBody CreatorTeamService.Change i,HttpServletRequest r){return teams.change(actor(r),i);}
 public record Selection(String ownerId,String action){}
 @PostMapping("/select") Object select(@RequestBody Selection i,HttpServletRequest r){return teams.choose(actor(r),i.ownerId(),i.action());}
}
