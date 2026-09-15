package com.mydream.cms.creator;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.mydream.cms.shared.ApiException;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;

@EnabledIfEnvironmentVariable(named="CREATOR_REMOVAL_TEST_DB",matches="jdbc:mysql://127.0.0.1:3317/creator_removal_test(?:\\?.*)?")
class CreatorRemovalIntegrationTest {
    JdbcTemplate jdbc; CreatorRemovalService service; CreatorMediaGateway media; CreatorProductionService projects;
    CreatorAccess.Viewer owner=new CreatorAccess.Viewer("creator:owner","Owner",false),other=new CreatorAccess.Viewer("creator:other","Other",false),admin=new CreatorAccess.Viewer("admin:test","Admin",true);
    @BeforeEach void setup(){
        var ds=new DriverManagerDataSource(System.getenv("CREATOR_REMOVAL_TEST_DB"),"root","");jdbc=new JdbcTemplate(ds);
        for(String table:List.of("cms_creator_removal_request","cms_creator_agreement","cms_creator_publication_check","cms_creator_project_settings","cms_creator_episode_publication","cms_creator_episode_submission","cms_creator_project_event","cms_creator_delivery","cms_creator_script"))jdbc.execute("DROP TABLE IF EXISTS "+table);
        jdbc.execute("CREATE TABLE cms_creator_script(id CHAR(36) PRIMARY KEY,owner_key VARCHAR(191),title VARCHAR(120),genre VARCHAR(40),format VARCHAR(40),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,status VARCHAR(20),episode_count INT NOT NULL DEFAULT 2,synopsis TEXT,body MEDIUMTEXT,lock_version INT DEFAULT 0,reviewed_at TIMESTAMP NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V26__creator_production.sql"),new ClassPathResource("db/migration/V27__creator_episode_submissions.sql"),new ClassPathResource("db/migration/V32__creator_project_settings.sql"),new ClassPathResource("db/migration/V38__creator_publication_checks.sql"),new ClassPathResource("db/migration/V40__creator_content_removal.sql")).execute(ds);
        jdbc.execute("CREATE TABLE cms_creator_agreement(scope_key VARCHAR(80))");
        jdbc.update("INSERT INTO cms_creator_script(id,owner_key,title,status,production_stage,synopsis,body) VALUES ('p','creator:owner','Project','ACTIVE','PRODUCING','story','script')");
        media=mock(CreatorMediaGateway.class);projects=new CreatorProductionService(jdbc,mock(CreatorVideoLookup.class));
        var proxy=new ProxyFactory(new CreatorRemovalService(jdbc,projects,media));proxy.setProxyTargetClass(true);proxy.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(ds),new AnnotationTransactionAttributeSource()));service=(CreatorRemovalService)proxy.getProxy();
    }
    CreatorRemovalService.Input input(String action,int version){return new CreatorRemovalService.Input(action,version,"test reason");}
    void episode(String state){jdbc.update("INSERT INTO cms_creator_episode_submission(id,script_id,episode_number,revision_no,title,description,filename,file_size,vod_video_id,attachment_id,note,review_note,state) VALUES ('e','p',1,1,'Episode','','e.mp4',10,'vod','attachment','','',?)",state);}
    String state(){return jdbc.queryForObject("SELECT state FROM cms_creator_episode_submission WHERE id='e'",String.class);}
    String request(){return jdbc.queryForObject("SELECT id FROM cms_creator_removal_request ORDER BY created_at DESC LIMIT 1",String.class);}
    Map<?,?> detail(String episode){return (Map<?,?>)service.detail(owner,"p",episode,false);}
    void link(){jdbc.update("INSERT INTO cms_creator_episode_publication(script_id,episode_number,submission_id,app_drama_id,app_episode_id,app_title,verified_by) VALUES ('p',1,'e',7,8,'Episode','admin:test')");}
    @Test void onlyOwnerCanMutateAndOnlyAdminCanReview(){
        episode("DRAFT");
        assertThatThrownBy(()->service.change(other,"p","e",input("DELETE",0))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.change(admin,"p","e",input("DELETE",0))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.review(owner,"p","unknown",input("ACCEPTED",0))).isInstanceOf(ApiException.class);
        assertThat(state()).isEqualTo("DRAFT");verifyNoInteractions(media);
    }
    @Test void draftProjectAndItsDraftsAreArchivedWithoutDeletingHistory(){
        episode("DRAFT");assertThat(detail("").get("action")).isEqualTo("DELETE");
        service.change(owner,"p","",input("DELETE",0));assertThat(state()).isEqualTo("ARCHIVED");
        assertThat(jdbc.queryForObject("SELECT status FROM cms_creator_script WHERE id='p'",String.class)).isEqualTo("ARCHIVED");
        assertThat((List<?>)projects.list(owner,false)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event",Integer.class)).isEqualTo(1);
        assertThatThrownBy(()->service.change(owner,"p","",input("DELETE",0))).isInstanceOf(ApiException.class);
        verifyNoInteractions(media);
    }
    @Test void pendingEpisodeMustWithdrawBeforeDeleteAndRejectsStaleVersion(){
        episode("SUBMITTED");assertThat(detail("e").get("action")).isEqualTo("WITHDRAW");
        assertThatThrownBy(()->service.change(owner,"p","e",input("DELETE",0))).isInstanceOf(ApiException.class);
        service.change(owner,"p","e",input("WITHDRAW",0));assertThat(state()).isEqualTo("DRAFT");
        assertThatThrownBy(()->service.change(owner,"p","e",input("DELETE",0))).isInstanceOf(ApiException.class);
        service.change(owner,"p","e",input("DELETE",1));assertThat(state()).isEqualTo("ARCHIVED");
    }
    @Test void projectWithdrawalWithdrawsOnlyPendingEpisodes(){
        episode("SUBMITTED");service.change(owner,"p","",input("WITHDRAW",0));
        assertThat(state()).isEqualTo("DRAFT");assertThat(detail("").get("version")).isEqualTo(1);
        assertThatThrownBy(()->service.change(owner,"p","",input("DELETE",0))).isInstanceOf(ApiException.class);
    }
    @Test void acceptedAndContractedProjectsRequireRequest(){
        episode("APPROVED");assertThat(detail("e").get("action")).isEqualTo("REQUEST");assertThat(detail("").get("action")).isEqualTo("REQUEST");
        assertThatThrownBy(()->service.change(owner,"p","e",input("DELETE",0))).isInstanceOf(ApiException.class);
        jdbc.update("UPDATE cms_creator_episode_submission SET state='ARCHIVED'");jdbc.update("INSERT INTO cms_creator_agreement(scope_key) VALUES ('p')");
        assertThat(detail("").get("action")).isEqualTo("REQUEST");
    }
    @Test void missingSubmissionCannotFallBackToProjectRemoval(){
        assertThatThrownBy(()->service.change(owner,"p","missing",input("DELETE",0))).isInstanceOf(ApiException.class);
        assertThat(detail("").get("action")).isEqualTo("DELETE");
    }
    @Test void completedReviewRequiresVerifiedOfflineAndRetainsPublications(){
        episode("APPROVED");link();service.change(owner,"p","e",input("REQUEST",0));String id=request();
        assertThatThrownBy(()->service.change(owner,"p","e",input("REQUEST",0))).isInstanceOf(ApiException.class);
        service.review(admin,"p",id,input("ACCEPTED",0));
        assertThatThrownBy(()->service.review(admin,"p",id,input("COMPLETED",0))).isInstanceOf(ApiException.class);
        when(media.verify(anyLong(),anyLong(),anyInt(),anyString(),anyString())).thenReturn(new CreatorMediaGateway.Published(7,8,1,"Episode"));
        assertThatThrownBy(()->service.review(admin,"p",id,input("COMPLETED",1))).hasMessageContaining("仍有已上架");
        when(media.verify(anyLong(),anyLong(),anyInt(),anyString(),anyString())).thenThrow(ApiException.unavailable("network unavailable"));
        assertThatThrownBy(()->service.review(admin,"p",id,input("COMPLETED",1))).hasMessageContaining("network unavailable");
        doThrow(new ApiException(org.springframework.http.HttpStatus.CONFLICT,"PUBLICATION_OFFLINE","offline")).when(media).verify(anyLong(),anyLong(),anyInt(),anyString(),anyString());
        service.review(admin,"p",id,input("COMPLETED",1));
        assertThat(jdbc.queryForObject("SELECT state FROM cms_creator_removal_request",String.class)).isEqualTo("COMPLETED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_publication",Integer.class)).isEqualTo(1);assertThat(state()).isEqualTo("APPROVED");
    }
    @Test void rejectionKeepsContentAndAllowsNewRequest(){
        episode("APPROVED");service.change(owner,"p","e",input("REQUEST",0));service.review(admin,"p",request(),input("REJECTED",0));
        assertThat(state()).isEqualTo("APPROVED");service.change(owner,"p","e",input("REQUEST",0));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_removal_request",Integer.class)).isEqualTo(2);
    }
    @Test void archivedPublicationHistoryStillBlocksHardRemoval(){
        episode("DRAFT");jdbc.update("INSERT INTO cms_creator_publication_check(script_id,episode_number,submission_id,app_drama_id,app_episode_id,status,message,actor_key) VALUES ('p',1,'e',7,8,'DELETED','test','admin:test')");
        assertThat(detail("e").get("action")).isEqualTo("REQUEST");assertThat(detail("").get("action")).isEqualTo("REQUEST");
    }
    @Test void concurrentRequestsCreateOnlyOneActiveRequest() throws Exception {
        episode("APPROVED");var pool=java.util.concurrent.Executors.newFixedThreadPool(2);var start=new java.util.concurrent.CountDownLatch(1);
        try {
            var jobs=new ArrayList<java.util.concurrent.Future<Boolean>>();
            for(int i=0;i<2;i++)jobs.add(pool.submit(()->{start.await();try{service.change(owner,"p","e",input("REQUEST",0));return true;}catch(ApiException ex){return false;}}));
            start.countDown();int successes=0;for(var job:jobs)if(job.get(10,java.util.concurrent.TimeUnit.SECONDS))successes++;
            assertThat(successes).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_removal_request",Integer.class)).isEqualTo(1);
        } finally {pool.shutdownNow();}
    }
    @Test void concurrentWithdrawalAndReviewCannotBothSucceed() throws Exception {
        episode("SUBMITTED");
        var proxy=new ProxyFactory(new CreatorEpisodeService(jdbc,projects,media));proxy.setProxyTargetClass(true);proxy.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(Objects.requireNonNull(jdbc.getDataSource())),new AnnotationTransactionAttributeSource()));var episodes=(CreatorEpisodeService)proxy.getProxy();
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);var start=new java.util.concurrent.CountDownLatch(1);
        try {
            var withdraw=pool.submit(()->{start.await();try{service.change(owner,"p","e",input("WITHDRAW",0));return true;}catch(ApiException ex){return false;}});
            var review=pool.submit(()->{start.await();try{episodes.review(admin,"p","e",new CreatorEpisodeService.ReviewInput("APPROVED","accepted",0));return true;}catch(ApiException ex){return false;}});
            start.countDown();assertThat(withdraw.get(10,java.util.concurrent.TimeUnit.SECONDS)^review.get(10,java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            assertThat(state()).isIn("DRAFT","APPROVED");
        } finally {pool.shutdownNow();}
    }
    @Test void queueIsAdminOnlyAndIncludesOnlyOpenRequests(){
        episode("APPROVED");service.change(owner,"p","e",input("REQUEST",0));
        assertThatThrownBy(()->service.queue(owner)).isInstanceOf(ApiException.class);
        assertThat((List<?>)service.queue(admin)).hasSize(1);
        service.review(admin,"p",request(),input("REJECTED",0));assertThat((List<?>)service.queue(admin)).isEmpty();
    }
    @Test void teamMembersCannotDeleteEvenWithEditingPermission(){
        var member=new CreatorTeamService.Scope("owner",true,true,true,true);
        for(String path:List.of("projects/p/removal","projects/p/episodes/e/removal"))assertThatThrownBy(()->CreatorTeamService.permit(member,path,"POST")).isInstanceOf(ApiException.class);
    }
}
