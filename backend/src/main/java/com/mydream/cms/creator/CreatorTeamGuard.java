package com.mydream.cms.creator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class CreatorTeamGuard implements WebMvcConfigurer {
 private final CreatorAccountService accounts;private final CreatorTeamService teams;
 public CreatorTeamGuard(CreatorAccountService accounts,CreatorTeamService teams){this.accounts=accounts;this.teams=teams;}
 @Override public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(new HandlerInterceptor(){
  @Override public boolean preHandle(HttpServletRequest r,HttpServletResponse response,Object handler){
   String token=CreatorAccountController.token(r);if(token==null||!token.startsWith("cr_"))return true;
   String path=r.getRequestURI().substring("/creator-api/v1/".length());
   if(path.startsWith("auth/")||path.equals("team")||path.startsWith("team/"))return true;
   var actor=accounts.require(token);var scope=teams.authorize(actor.id(),path,r.getMethod());
   if(scope.member()||teams.company(actor.id())){r.setAttribute("team-owner",scope.owner());r.setAttribute("team-actor",actor.id());r.setAttribute("team-cooperation-view",scope.has("cooperation.view"));}return true;
  }
  @Override public void afterCompletion(HttpServletRequest r,HttpServletResponse response,Object handler,Exception ex){
   if(!r.getMethod().equals("GET")&&response.getStatus()<400&&ex==null&&r.getAttribute("team-owner")!=null)teams.audit(r.getAttribute("team-owner").toString(),r.getAttribute("team-actor").toString(),r.getMethod()+" "+r.getRequestURI());
  }
 }).addPathPatterns("/creator-api/v1/**");}
}
