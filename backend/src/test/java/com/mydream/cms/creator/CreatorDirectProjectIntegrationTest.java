package com.mydream.cms.creator;

import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import com.mydream.cms.shared.ApiException;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@EnabledIfEnvironmentVariable(named="CREATOR_DIRECT_TEST_DB",matches="jdbc:mysql://127.0.0.1:3309/creator_direct_project_test(?:\\?.*)?")
class CreatorDirectProjectIntegrationTest {
    JdbcTemplate jdbc; CreatorProductionService projects; CreatorEpisodeService episodes; CreatorMediaGateway media;
    final CreatorAccess.Viewer owner=new CreatorAccess.Viewer("creator:direct-test","Synthetic",false),other=new CreatorAccess.Viewer("creator:other","Other",false),admin=new CreatorAccess.Viewer("admin:reviewer","Reviewer",true);
    @Test void projectContentEditingUsesOwnershipAndVersion(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        assertThatThrownBy(()->projects.content(other,id,new CreatorProductionService.ContentInput("New","都市","Story",0))).isInstanceOf(ApiException.class);
        projects.content(owner,id,new CreatorProductionService.ContentInput("New","都市","Story",0));
        assertThat(projects.detail(owner,id,false).get("title")).isEqualTo("New");
        assertThatThrownBy(()->projects.content(owner,id,new CreatorProductionService.ContentInput("Stale","都市","Story",0))).isInstanceOf(ApiException.class);
    }
    @Test void companyMembersKeepIndependentReadMarkers(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        var request=new org.springframework.mock.web.MockHttpServletRequest();request.setAttribute("team-actor","member-one");
        var access=mock(CreatorAccess.class);when(access.require(request,null)).thenReturn(owner);
        var workflow=new CreatorWorkflowController(jdbc,access,projects);
        String event=jdbc.queryForObject("SELECT id FROM cms_creator_project_event WHERE script_id=?",String.class,id);
        workflow.read(new CreatorWorkflowController.ReadInput(List.of(event)),request,null);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_notification_read WHERE owner_key='creator:member-one'",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_notification_read WHERE owner_key=?",Integer.class,owner.ownerKey())).isZero();
    }
    @Test void creativeIdentitiesSeparateProjectsAndRejectCrossTypeEdits(){
        jdbc.execute("ALTER TABLE cms_creator_script ADD work_type VARCHAR(24) NOT NULL DEFAULT 'UNCLASSIFIED'");
        var comic=new CreatorAccess.Viewer(owner.ownerKey(),"Synthetic",false,CreatorWorkType.COMIC);
        var drama=new CreatorAccess.Viewer(owner.ownerKey(),"Synthetic",false,CreatorWorkType.SHORT_DRAMA);
        var ci=new CreatorProductionService.ProjectInput("Comic","test","漫劇",2,"Summary",true,input(2,true).settings());
        var di=new CreatorProductionService.ProjectInput("Drama","test","短劇",2,"Summary",true,input(2,true).settings());
        String cid=projects.create(comic,ci).get("id").toString(),did=projects.create(drama,di).get("id").toString();
        assertThat(projects.detail(comic,cid,false).get("title")).isEqualTo("Comic");
        assertThat(projects.detail(drama,did,false).get("title")).isEqualTo("Drama");
        assertThatThrownBy(()->projects.detail(comic,did,false)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.detail(drama,cid,false)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.content(drama,cid,new CreatorProductionService.ContentInput("Wrong","test","Wrong",0))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.create(comic,di)).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT title FROM cms_creator_script WHERE id=?",String.class,cid)).isEqualTo("Comic");
    }
    @BeforeEach void setup(){
        var ds=new DriverManagerDataSource(System.getenv("CREATOR_DIRECT_TEST_DB"),"root","");jdbc=new JdbcTemplate(ds);
        for(var table:List.of("cms_creator_project_materials","cms_creator_settings_sync","cms_creator_notification_read","cms_creator_material_review","cms_creator_project_settings","cms_creator_episode_publication","cms_creator_episode_submission","cms_creator_project_event","cms_creator_delivery","cms_creator_script","cms_creator_profile","cms_creator_ip_interest","cms_creator_favorite"))jdbc.execute("DROP TABLE IF EXISTS "+table);
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V25__creator_workspace.sql"),new ClassPathResource("db/migration/V26__creator_production.sql"),new ClassPathResource("db/migration/V27__creator_episode_submissions.sql"),new ClassPathResource("db/migration/V32__creator_project_settings.sql"),new ClassPathResource("db/migration/V35__creator_workflow.sql"),new ClassPathResource("db/migration/V34__creator_project_materials.sql")).execute(ds);
        jdbc.execute("DROP TABLE IF EXISTS cms_creator_publication_check");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V38__creator_publication_checks.sql")).execute(ds);
        jdbc.execute("DROP TABLE IF EXISTS cms_creator_verification");
        jdbc.execute("CREATE TABLE cms_creator_verification(owner_key VARCHAR(191) PRIMARY KEY,state VARCHAR(32))");
        projects=new CreatorProductionService(jdbc,mock(CreatorVideoLookup.class));media=mock(CreatorMediaGateway.class);episodes=new CreatorEpisodeService(jdbc,projects,media);
        when(media.create(anyString(),anyString(),anyString())).thenReturn(new ObjectMapper().readTree("{\"VideoId\":\"synthetic\",\"attachment_id\":\"test\"}"));
    }
    CreatorProductionService.ProjectInput input(int count,boolean promise){return new CreatorProductionService.ProjectInput("Synthetic project","test","comic",count,"Synthetic project summary",promise,new CreatorProductionService.Settings("zhf","22",false,new java.math.BigDecimal("30")));}
    @Test void workflowCollationMigrationRepairsNotificationsAndPreservesReadState() {
        String id=projects.create(owner,input(1,true)).get("id").toString();
        String event=jdbc.queryForObject("SELECT id FROM cms_creator_project_event WHERE script_id=?",String.class,id);
        var access=mock(CreatorAccess.class);when(access.require(null,null)).thenReturn(owner);
        var workflow=new CreatorWorkflowController(jdbc,access,projects);
        workflow.read(new CreatorWorkflowController.ReadInput(List.of(event)),null,null);
        jdbc.execute("ALTER TABLE cms_creator_notification_read CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
        assertThatThrownBy(()->workflow.notifications(null,null)).isInstanceOf(org.springframework.dao.DataAccessException.class);
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V39__creator_workflow_collations.sql")).execute(jdbc.getDataSource());
        var notices=(List<Map<String,Object>>)((Map<?,?>)workflow.notifications(null,null)).get("items");
        assertThat(notices).hasSize(1);
        assertThat(notices.get(0).get("id")).isEqualTo(event);
        assertThat(notices.get(0).get("isRead").toString()).isIn("1","true");
        workflow.read(new CreatorWorkflowController.ReadInput(List.of(event)),null,null);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_notification_read",Integer.class)).isEqualTo(1);
        when(access.require(null,null)).thenReturn(other);
        assertThat((List<?>)((Map<?,?>)workflow.notifications(null,null)).get("items")).isEmpty();
    }
    @Test void createsDirectlyWithCommittedCountWithoutPretendingScriptApproval(){
        var p=projects.create(owner,input(3,true));var id=p.get("id").toString();
        assertThat(p.get("stage")).isEqualTo("PRODUCING");assertThat(p.get("status")).isEqualTo("ACTIVE");assertThat(p.get("episodeCount")).isEqualTo(3);
        assertThat((List<?>)projects.list(owner,false)).hasSize(1);assertThat((List<?>)projects.list(admin,true)).hasSize(1);
        assertThatCode(()->new CreatorAgreementService(jdbc).requireProject(owner,id)).doesNotThrowAnyException();
        assertThatThrownBy(()->projects.detail(other,id,false)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->new CreatorAgreementService(jdbc).requireProject(other,id)).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event WHERE script_id=?",Integer.class,id)).isEqualTo(1);
    }
    @Test void uploadsOnlyWithinCommittedCountAndDoesNotCallMediaForInvalidEpisodes(){
        String id=projects.create(owner,input(3,true)).get("id").toString();
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(3,"Third","","episode.mp4",100),"Bearer synthetic");
        verify(media,times(1)).create(anyString(),anyString(),anyString());
        for(int number:new int[]{0,4})assertThatThrownBy(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(number,"Invalid","","episode.mp4",100),"Bearer synthetic")).isInstanceOf(ApiException.class);
        verifyNoMoreInteractions(media);
    }
    @Test void rejectsMissingPromiseInvalidCountsAndAdminCreation(){
        for(int count:new int[]{0,501})assertThatThrownBy(()->projects.create(owner,input(count,true))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.create(owner,input(3,false))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.create(admin,input(3,true))).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_script",Integer.class)).isZero();
    }
    @Test void publicationRequiresApprovedCreatorIdentity(){
        var id=projects.create(owner,input(2,true)).get("id").toString();
        assertThat(((Map<?,?>)episodes.detail(admin,id,true)).get("publicationAllowed")).isEqualTo(false);
        assertThatThrownBy(()->episodes.link(admin,id,"missing",new CreatorEpisodeService.PublicationInput(1,1,0))).hasMessageContaining("身份認證");
        jdbc.update("INSERT INTO cms_creator_verification(owner_key,state) VALUES (?, 'APPROVED')",owner.ownerKey());
        assertThat(((Map<?,?>)episodes.detail(admin,id,true)).get("publicationAllowed")).isEqualTo(true);
    }
    @Test void projectSettingsPersistValidateAndRequireOwnership(){
        var id=projects.create(owner,input(2,true)).get("id").toString();
        var config=(Map<?,?>)projects.detail(owner,id,false).get("settings");
        assertThat(config.get("area")).isEqualTo("zhf");assertThat(config.get("price").toString()).isEqualTo("30.00");
        var changed=new CreatorProductionService.Settings("en","64",true,new java.math.BigDecimal("5.50"));
        assertThatThrownBy(()->projects.settings(other,id,changed)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.settings(owner,id,new CreatorProductionService.Settings("en","22",false,java.math.BigDecimal.ZERO))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.settings(owner,id,new CreatorProductionService.Settings("zhf","22",false,new java.math.BigDecimal("-1")))).isInstanceOf(ApiException.class);
        jdbc.update("DELETE FROM cms_creator_project_settings WHERE project_id=?",id);
        assertThat(projects.detail(owner,id,false).get("settings")).isNull();
        assertThat(((Map<?,?>)projects.settings(owner,id,changed).get("settings")).get("category")).isEqualTo("64");
    }

    @Test void publishedProjectSettingsRemainEditableWithoutUnlockingVideosOrChangingStage(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic");
        String submission=jdbc.queryForObject("SELECT id FROM cms_creator_episode_submission WHERE script_id=?",String.class,id);
        jdbc.update("UPDATE cms_creator_episode_submission SET state='APPROVED' WHERE id=?",submission);
        jdbc.update("INSERT INTO cms_creator_episode_publication(script_id,episode_number,submission_id,app_drama_id,app_episode_id,app_title,verified_by) VALUES (?,1,?,200,201,'Synthetic','reviewer')",id,submission);
        jdbc.update("UPDATE cms_creator_script SET production_stage='COMPLETED' WHERE id=?",id);
        var changed=projects.settings(owner,id,new CreatorProductionService.Settings("en","64",true,new java.math.BigDecimal("10")));
        assertThat(changed.get("stage")).isEqualTo("COMPLETED");
        assertThat(((Map<?,?>)changed.get("settings")).get("category")).isEqualTo("64");
        assertThat(jdbc.queryForObject("SELECT app_episode_id FROM cms_creator_episode_publication WHERE script_id=?",Long.class,id)).isEqualTo(201);
        assertThatThrownBy(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"Again","","again.mp4",100),"Bearer synthetic")).isInstanceOf(ApiException.class);
    }
    @Test void missingPublicationFieldsBlockUploadBeforeRequestingMediaCredentials(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        jdbc.update("DELETE FROM cms_creator_project_settings WHERE project_id=?",id);
        assertThatThrownBy(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic")).isInstanceOf(ApiException.class).hasMessageContaining("必填");
        verifyNoInteractions(media);
        projects.settings(owner,id,new CreatorProductionService.Settings("zhf","22",false,java.math.BigDecimal.ZERO));
        assertThatCode(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic")).doesNotThrowAnyException();
        verify(media).create(anyString(),eq("First"),eq("episode.mp4"));
    }
    @Test void analyticsPublicationsAreScopedToCreatorOwner(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic");
        String submission=jdbc.queryForObject("SELECT id FROM cms_creator_episode_submission WHERE script_id=?",String.class,id);
        jdbc.update("INSERT INTO cms_creator_episode_publication(script_id,episode_number,submission_id,app_drama_id,app_episode_id,app_title,verified_by) VALUES (?,1,?,100,101,'Synthetic','reviewer')",id,submission);
        assertThat((List<?>)episodes.publications(owner)).hasSize(1);
        assertThat((List<?>)episodes.publications(other)).isEmpty();
        assertThatThrownBy(()->episodes.publications(admin)).isInstanceOf(ApiException.class);
    }

    @Test void approvedOrPublishedEpisodesRejectAnotherUpload(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic");
        jdbc.update("UPDATE cms_creator_episode_submission SET state='APPROVED' WHERE script_id=?",id);
        assertThatThrownBy(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"Again","","again.mp4",100),"Bearer synthetic")).isInstanceOf(ApiException.class);
        String submission=jdbc.queryForObject("SELECT id FROM cms_creator_episode_submission WHERE script_id=?",String.class,id);
        jdbc.update("INSERT INTO cms_creator_episode_publication(script_id,episode_number,submission_id,app_drama_id,app_episode_id,app_title,verified_by) VALUES (?,1,?,200,201,'Synthetic','reviewer')",id,submission);
        jdbc.update("UPDATE cms_creator_episode_submission SET state='CHANGES_REQUESTED' WHERE script_id=?",id);
        assertThatThrownBy(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"Again","","again.mp4",100),"Bearer synthetic")).isInstanceOf(ApiException.class);
        verify(media,times(1)).create(anyString(),anyString(),anyString());
    }

    @Test void editPolicyCoversEveryStateAndStaleDraftSubmission(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic");
        String first=jdbc.queryForObject("SELECT id FROM cms_creator_episode_submission WHERE script_id=?",String.class,id);
        for(String state:List.of("SUBMITTED","APPROVED","UNKNOWN")){
            jdbc.update("UPDATE cms_creator_episode_submission SET state=? WHERE id=?",state,first);
            assertThatThrownBy(()->episodes.editable(owner,id,first)).isInstanceOf(ApiException.class);
            assertThatThrownBy(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"Again","","again.mp4",100),"Bearer synthetic")).isInstanceOf(ApiException.class);
        }
        for(String state:List.of("DRAFT","CHANGES_REQUESTED")){
            jdbc.update("UPDATE cms_creator_episode_submission SET state=? WHERE id=?",state,first);
            assertThatCode(()->episodes.editable(owner,id,first)).doesNotThrowAnyException();
        }
        assertThatThrownBy(()->episodes.editable(other,id,first)).isInstanceOf(ApiException.class);
        when(media.create(anyString(),anyString(),anyString())).thenReturn(new ObjectMapper().readTree("{\"VideoId\":\"synthetic-second\",\"attachment_id\":\"second\"}"));
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"Second","","second.mp4",100),"Bearer synthetic");
        String second=jdbc.queryForObject("SELECT id FROM cms_creator_episode_submission WHERE script_id=? AND revision_no=2",String.class,id);
        assertThatThrownBy(()->episodes.editable(owner,id,first)).isInstanceOf(ApiException.class);
        jdbc.update("UPDATE cms_creator_episode_submission SET state='APPROVED' WHERE id=?",first);
        assertThatThrownBy(()->episodes.submit(owner,id,second,new CreatorEpisodeService.SubmitInput("Second","","https://example.com/cover.png","note",0))).isInstanceOf(ApiException.class);
        verify(media,never()).readyMedia(anyString(),anyString());
    }

    @Test void workflowOwnershipAndReadMarkersAreScoped(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        var access=mock(CreatorAccess.class);when(access.require(null,null)).thenReturn(owner);
        var workflow=new CreatorWorkflowController(jdbc,access,projects);
        var response=(Map<?,?>)workflow.notifications(null,null);assertThat((List<?>)response.get("items")).hasSize(1);
        String event=jdbc.queryForObject("SELECT id FROM cms_creator_project_event WHERE script_id=?",String.class,id);
        workflow.read(new CreatorWorkflowController.ReadInput(List.of(event)),null,null);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_notification_read WHERE owner_key=?",Integer.class,owner.ownerKey())).isEqualTo(1);
        when(access.require(null,null)).thenReturn(other);
        assertThat((List<?>)((Map<?,?>)workflow.notifications(null,null)).get("items")).isEmpty();
        workflow.read(new CreatorWorkflowController.ReadInput(List.of(event)),null,null);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_notification_read WHERE owner_key=?",Integer.class,other.ownerKey())).isZero();
        assertThatThrownBy(()->workflow.mine(id,null,null)).isInstanceOf(ApiException.class);
    }
    @Test void staleSyncCompletionCannotClearNewRevision(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        jdbc.update("INSERT INTO cms_creator_settings_sync(project_id,revision,state,claim_token) VALUES (?,2,'SYNCING','new-claim')",id);
        var access=mock(CreatorAccess.class);when(access.require(null,null)).thenReturn(admin);
        var workflow=new CreatorWorkflowController(jdbc,access,projects);
        workflow.finish(id,new CreatorWorkflowController.SyncResult(1,"old-claim",true,""),null,null);
        assertThat(jdbc.queryForObject("SELECT state FROM cms_creator_settings_sync WHERE project_id=?",String.class,id)).isEqualTo("SYNCING");
        workflow.finish(id,new CreatorWorkflowController.SyncResult(2,"new-claim",true,""),null,null);
        assertThat(jdbc.queryForObject("SELECT state FROM cms_creator_settings_sync WHERE project_id=?",String.class,id)).isEqualTo("SYNCED");
    }
    @Test void materialsReviewRequiresCurrentVersionAndAdmin(){
        String id=projects.create(owner,input(2,true)).get("id").toString();
        jdbc.update("INSERT INTO cms_creator_material_review(project_id,version) VALUES (?,2)",id);
        var access=mock(CreatorAccess.class);when(access.require(null,null)).thenReturn(owner);
        var workflow=new CreatorWorkflowController(jdbc,access,projects);
        var review=new CreatorWorkflowController.ReviewInput("CHANGES_REQUESTED","Please add rights document",2);
        assertThatThrownBy(()->workflow.materialsReview(id,review,null,null)).isInstanceOf(ApiException.class);
        when(access.require(null,null)).thenReturn(admin);
        assertThatThrownBy(()->workflow.materialsReview(id,new CreatorWorkflowController.ReviewInput("APPROVED","OK",1),null,null)).isInstanceOf(ApiException.class);
        workflow.materialsReview(id,review,null,null);
        assertThat(jdbc.queryForObject("SELECT state FROM cms_creator_material_review WHERE project_id=?",String.class,id)).isEqualTo("CHANGES_REQUESTED");
    }

    @Test void syntheticDeliveryReturnResubmitApprovalPublicationAndNotifications(){
        String id=projects.create(owner,input(1,true)).get("id").toString();
        when(media.readyMedia(anyString(),anyString())).thenReturn("https://example.com/synthetic.mp4");
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic");
        String submission=jdbc.queryForObject("SELECT id FROM cms_creator_episode_submission WHERE script_id=?",String.class,id);
        episodes.submit(owner,id,submission,new CreatorEpisodeService.SubmitInput("First","","https://example.com/cover.png","Ready",0));
        episodes.review(admin,id,submission,new CreatorEpisodeService.ReviewInput("CHANGES_REQUESTED","Fix cover",1));
        episodes.submit(owner,id,submission,new CreatorEpisodeService.SubmitInput("First","","https://example.com/fixed.png","Fixed",2));
        episodes.review(admin,id,submission,new CreatorEpisodeService.ReviewInput("APPROVED","Approved",3));
        jdbc.update("INSERT INTO cms_creator_verification(owner_key,state) VALUES (?, 'APPROVED')",owner.ownerKey());
        when(media.verify(eq(900L),eq(901L),eq(1),anyString(),anyString())).thenReturn(new CreatorMediaGateway.Published(900,901,1,"Synthetic"));
        episodes.link(admin,id,submission,new CreatorEpisodeService.PublicationInput(900,901,4));
        assertThat((List<?>)episodes.publications(owner)).hasSize(1);
        var access=mock(CreatorAccess.class);when(access.require(null,null)).thenReturn(owner);
        var workflow=new CreatorWorkflowController(jdbc,access,projects);
        var notices=(List<Map<String,Object>>)((Map<?,?>)workflow.notifications(null,null)).get("items");
        assertThat(notices.stream().map(n->n.get("kind")).toList()).contains("SUBMITTED","RETURNED","APPROVED","PUBLISHED");
        assertThat(notices.stream().filter(n->n.get("kind").equals("PUBLISHED")).findFirst().orElseThrow().get("href")).isEqualTo("#projects?project="+id+"&episode=1");
    }

    @Test void materialsSubmitReturnResubmitAndApproveWithoutUnlockingVideo(){
        String id=projects.create(owner,input(1,true)).get("id").toString();
        var access=mock(CreatorAccess.class);when(access.require(null,null)).thenReturn(owner);
        var config=mock(com.mydream.cms.config.CmsProperties.class);when(config.piiKeyBase64()).thenReturn(Base64.getEncoder().encodeToString(new byte[32]));
        var materials=new CreatorProjectMaterialsController(access,projects,jdbc,new com.mydream.cms.forms.PiiCipher(config),new ObjectMapper());
        var workflow=new CreatorWorkflowController(jdbc,access,projects);
        var first=new CreatorProjectMaterialsController.Input(Map.of("company","Synthetic studio"),List.of(),0);
        var saved=(Map<?,?>)materials.save(id,first,null,null);
        assertThat(saved.get("reviewState")).isEqualTo("PENDING");assertThat(saved.get("locked")).isEqualTo(true);
        assertThatThrownBy(()->materials.save(id,new CreatorProjectMaterialsController.Input(Map.of("company","Changed"),List.of(),1),null,null)).isInstanceOf(ApiException.class);
        when(access.require(null,null)).thenReturn(admin);
        workflow.materialsReview(id,new CreatorWorkflowController.ReviewInput("CHANGES_REQUESTED","Add producer",1),null,null);
        when(access.require(null,null)).thenReturn(owner);
        assertThat(((Map<?,?>)materials.mine(id,null,null)).get("locked")).isEqualTo(false);
        episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"First","","episode.mp4",100),"Bearer synthetic");
        jdbc.update("UPDATE cms_creator_episode_submission SET state='APPROVED' WHERE script_id=?",id);
        saved=(Map<?,?>)materials.save(id,new CreatorProjectMaterialsController.Input(Map.of("company","Synthetic studio","producer","Synthetic producer"),List.of(),1),null,null);
        assertThat(saved.get("version")).isEqualTo(2);assertThat(saved.get("reviewState")).isEqualTo("PENDING");
        assertThatThrownBy(()->episodes.create(owner,id,new CreatorEpisodeService.UploadInput(1,"Again","","again.mp4",100),"Bearer synthetic")).isInstanceOf(ApiException.class);
        when(access.require(null,null)).thenReturn(admin);
        workflow.materialsReview(id,new CreatorWorkflowController.ReviewInput("APPROVED","Confirmed",2),null,null);
        when(access.require(null,null)).thenReturn(owner);
        var approved=(Map<?,?>)materials.mine(id,null,null);assertThat(approved.get("reviewState")).isEqualTo("APPROVED");assertThat(approved.get("locked")).isEqualTo(true);assertThat((List<?>)approved.get("history")).hasSize(4);
        assertThat(jdbc.queryForObject("SELECT payload_encrypted FROM cms_creator_project_materials WHERE project_id=?",String.class,id)).doesNotContain("Synthetic studio");
        when(access.require(null,null)).thenReturn(other);assertThatThrownBy(()->materials.mine(id,null,null)).isInstanceOf(ApiException.class);
    }
}
