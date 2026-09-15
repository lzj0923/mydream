package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import com.mydream.cms.shared.ApiException;
class CreatorMemberRoleTest {
 @Test void roleRequestsDoNotRequireLegacyCheckboxFields(){
  var mapper=new tools.jackson.databind.ObjectMapper();
  var invite=mapper.readValue("{\"account\":\"member\",\"role\":\"VIEWER\",\"permissions\":[]}",CreatorTeamService.Invite.class);
  var change=mapper.readValue("{\"accountId\":\"member\",\"action\":\"PERMISSIONS\",\"role\":\"ANALYST\"}",CreatorTeamService.Change.class);
  assertThat(invite.role()).isEqualTo("VIEWER");assertThat(invite.canEdit()).isNull();assertThat(change.role()).isEqualTo("ANALYST");
 }
 @Test void everyPresetDeniesFinanceAndPlatformAdministration(){
  for(String key:List.of("VIEWER","CREATOR","OPERATOR","ANALYST","BUSINESS")){
   var r=CreatorMemberRole.input(key,null,false,false,false);
   var s=new CreatorTeamService.Scope("owner",true,r.has("project.edit"),r.has("video.edit"),r.has("delivery.submit"),key,r.permissions());
   for(String path:List.of("bank-account","withdrawals","contracts","auth/bind","project-reviews","projects/p/removal"))for(String method:List.of("GET","POST","PUT","DELETE"))assertThatThrownBy(()->CreatorTeamService.permit(s,path,method)).isInstanceOf(ApiException.class);
   if(r.has("traffic.view"))CreatorTeamService.permit(s,"project-publications","GET");else assertThatThrownBy(()->CreatorTeamService.permit(s,"project-publications","GET")).isInstanceOf(ApiException.class);
  }
 }
 @Test void membersCannotRequestOwnerPermissionsOrBrokenDependencies(){
  assertThatThrownBy(()->CreatorMemberRole.input("OWNER",null,false,false,false)).isInstanceOf(ApiException.class);
  for(var p:List.of(List.of("bank.edit"),List.of("traffic.export"),List.of("delivery.submit"),List.of("cooperation.edit")))assertThatThrownBy(()->CreatorMemberRole.input("CUSTOM",p,false,false,false)).isInstanceOf(ApiException.class);
 }
 @Test void legacyAssignmentsNeverGainNewPowers(){
  for(int mask=0;mask<8;mask++){var r=CreatorMemberRole.input(null,null,(mask&1)>0,(mask&2)>0,(mask&4)>0);assertThat(r.extra()).isEmpty();assertThat(r.has("project.edit")).isEqualTo((mask&1)>0);assertThat(r.has("video.edit")).isEqualTo((mask&2)>0);assertThat(r.has("delivery.submit")).isEqualTo((mask&4)>0);}
 }
}
