package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import com.mydream.cms.shared.ApiException;
class CreatorTeamTest {
 @Test void appCredentialsRequireServerAuthentication(){
  var accounts=org.mockito.Mockito.mock(CreatorAccountService.class);var controller=new CreatorAccountController(accounts);var r=new org.springframework.mock.web.MockHttpServletRequest();r.addHeader("Authorization","Bearer cr_member");
  org.springframework.test.util.ReflectionTestUtils.setField(controller,"serverKey","synthetic-server-key-at-least-32-characters");
  assertThatThrownBy(()->controller.appSession("UPLOAD",r)).isInstanceOf(ApiException.class);org.mockito.Mockito.verifyNoInteractions(accounts);
  r.addHeader("X-Creator-Server-Key","synthetic-server-key-at-least-32-characters");controller.appSession("UPLOAD",r);org.mockito.Mockito.verify(accounts).appSession("cr_member","UPLOAD");
 }
 @Test void memberReadOnlyAndFinanceAreDenied(){
  var s=new CreatorTeamService.Scope("company",true,false,false,false);
  for(String p:new String[]{"workspace","projects","projects/abc/episodes","projects/abc/materials","project-episodes"})CreatorTeamService.permit(s,p,"GET");
  for(String p:new String[]{"bank-account","withdrawals","profile","contracts","project-reviews","unknown"})for(String m:new String[]{"GET","POST","PUT","DELETE"})assertThatThrownBy(()->CreatorTeamService.permit(s,p,m)).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->CreatorTeamService.permit(s,"projects","POST")).isInstanceOf(ApiException.class);
 }
 @Test void uploadAndSubmitAreSeparate(){
  var upload=new CreatorTeamService.Scope("company",true,false,true,false);
  CreatorTeamService.permit(upload,"projects/abc/uploads","POST");CreatorTeamService.permit(upload,"projects/abc/episodes/def/draft","POST");CreatorTeamService.permit(upload,"projects/abc/episodes/def/edit-check","POST");
  assertThatThrownBy(()->CreatorTeamService.permit(upload,"projects/abc/episodes/def/submit","POST")).isInstanceOf(ApiException.class);
  var submit=new CreatorTeamService.Scope("company",true,false,false,true);
  CreatorTeamService.permit(submit,"projects/abc/episodes/def/submit","POST");
  assertThatThrownBy(()->CreatorTeamService.permit(submit,"projects/abc/uploads","POST")).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->CreatorTeamService.permit(submit,"projects/abc/episodes/def/draft","POST")).isInstanceOf(ApiException.class);
 }
 @Test void editNeverGrantsFinancialOrSubmitPermission(){
  var s=new CreatorTeamService.Scope("company",true,true,false,false);
  CreatorTeamService.permit(s,"projects","POST");CreatorTeamService.permit(s,"projects/abc/settings","PUT");CreatorTeamService.permit(s,"projects/abc/materials","POST");
  for(String p:new String[]{"bank-account","withdrawals","projects/abc/episodes/def/submit"})assertThatThrownBy(()->CreatorTeamService.permit(s,p,"POST")).isInstanceOf(ApiException.class);
 }
}
