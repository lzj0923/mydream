package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.*;
import org.springframework.mock.web.MockHttpServletRequest;
import com.mydream.cms.shared.ApiException;

class CreatorPublicationChecksTest {
 @Test void storesSuccessMissingAndConnectionFailureSeparately(){
  for(String expected:List.of("PUBLISHED","UNAVAILABLE","UNKNOWN")){
   var jdbc=mock(JdbcTemplate.class);var projects=mock(CreatorProductionService.class);var media=mock(CreatorMediaGateway.class);var checks=mock(CreatorPublicationChecks.class);
   var service=new CreatorEpisodeService(jdbc,projects,media);ReflectionTestUtils.setField(service,"checks",checks);
   var viewer=new CreatorAccess.Viewer("creator:owner","Owner",false);
   when(projects.detail(viewer,"project",false)).thenReturn(new LinkedHashMap<>());
   when(jdbc.queryForMap(anyString(),eq("project"))).thenReturn(Map.of());
   var row=Map.<String,Object>of("episodeNumber",1,"appDramaId",723L,"appEpisodeId",21222L,"submissionId","submission","attachmentId","attachment","vodVideoId","vod");
   when(jdbc.queryForList(anyString(),eq("project"),eq(1))).thenReturn(List.of(row));
   when(checks.save(eq(viewer),eq("project"),eq(row),anyString(),anyString())).thenReturn(true);
   if(expected.equals("UNAVAILABLE"))when(media.verify(723,21222,1,"attachment","vod")).thenThrow(ApiException.conflict("App 劇目尚未上架或不存在"));
   if(expected.equals("UNKNOWN"))when(media.verify(723,21222,1,"attachment","vod")).thenThrow(ApiException.unavailable("網絡異常"));
   service.check(viewer,"project",false,1);
   verify(checks).save(eq(viewer),eq("project"),eq(row),eq(expected),anyString());
  }
 }
 @Test void rejectsAccessBeforeCallingApp(){
  var jdbc=mock(JdbcTemplate.class);var projects=mock(CreatorProductionService.class);var media=mock(CreatorMediaGateway.class);
  var viewer=new CreatorAccess.Viewer("creator:other","Other",false);
  when(projects.detail(viewer,"project",false)).thenThrow(ApiException.notFound("not owned"));
  assertThatThrownBy(()->new CreatorEpisodeService(jdbc,projects,media).check(viewer,"project",false,1)).isInstanceOf(ApiException.class);
  verifyNoInteractions(media,jdbc);
 }
 @Test void auditUsesActualMemberInsteadOfCompanyOwner(){
  var viewer=new CreatorAccess.Viewer("creator:company","Company",false);
  assertThat(CreatorPublicationChecks.actor(viewer)).isEqualTo("creator:company");
  var request=new MockHttpServletRequest();request.setAttribute("team-actor","member");
  RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
  try{assertThat(CreatorPublicationChecks.actor(viewer)).isEqualTo("creator:member");}
  finally{RequestContextHolder.resetRequestAttributes();}
 }
}
