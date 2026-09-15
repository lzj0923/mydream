package com.mydream.cms.creator;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.mydream.cms.shared.ApiException;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named="CREATOR_EPISODE_TEST_DB",matches="jdbc:mysql://127.0.0.1:(?:3309|3317)/creator_episode_test(?:\\?.*)?")
class CreatorEpisodeIntegrationTest {
    JdbcTemplate jdbc; CreatorEpisodeService service; CreatorProductionService projects; CreatorMediaGateway media;
    final CreatorAccess.Viewer owner=new CreatorAccess.Viewer("app:452","Writer",false),other=new CreatorAccess.Viewer("app:453","Other",false),admin=new CreatorAccess.Viewer("admin:test","Admin",true);
    @BeforeEach void setup(){
        var ds=new DriverManagerDataSource(System.getenv("CREATOR_EPISODE_TEST_DB"),"root","");jdbc=new JdbcTemplate(ds);
        for(String name:List.of("cms_creator_publication_check","cms_creator_publication_check_history","cms_creator_project_settings","cms_creator_episode_publication","cms_creator_episode_submission","cms_creator_project_event","cms_creator_delivery","cms_creator_script"))jdbc.execute("DROP TABLE IF EXISTS "+name);
        jdbc.execute("CREATE TABLE cms_creator_script(id CHAR(36) PRIMARY KEY,owner_key VARCHAR(191),title VARCHAR(120),genre VARCHAR(40),format VARCHAR(40),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,status VARCHAR(20),episode_count INT NOT NULL DEFAULT 2,synopsis TEXT,body MEDIUMTEXT,lock_version INT DEFAULT 0,reviewed_at TIMESTAMP NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V26__creator_production.sql"),new ClassPathResource("db/migration/V27__creator_episode_submissions.sql"),new ClassPathResource("db/migration/V32__creator_project_settings.sql")).execute(ds);
        jdbc.update("INSERT INTO cms_creator_script(id,owner_key,title,status,production_stage,synopsis,body) VALUES ('a','app:452','A','APPROVED','PRODUCING','story','script'),('b','app:453','B','APPROVED','PRODUCING','story','script'),('pending','app:452','Pending','APPROVED','PENDING_CONTRACT','','')");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V38__creator_publication_checks.sql")).execute(ds);
        jdbc.update("INSERT INTO cms_creator_project_settings(project_id,area,category_id,landscape,unlock_price) VALUES ('a','zhf','22',false,0),('b','zhf','22',false,0)");
        media=mock(CreatorMediaGateway.class);projects=new CreatorProductionService(jdbc,mock(CreatorVideoLookup.class));
        var target=new CreatorEpisodeService(jdbc,projects,media);var proxy=new ProxyFactory(target);proxy.setProxyTargetClass(true);proxy.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(ds),new AnnotationTransactionAttributeSource()));service=(CreatorEpisodeService)proxy.getProxy();
        var counter=new AtomicInteger();when(media.create(anyString(),anyString(),anyString())).thenAnswer(invocation->{int n=counter.incrementAndGet();return new ObjectMapper().readTree("{\"VideoId\":\"trusted-video-"+n+"\",\"attachment_id\":\""+n+"\",\"UploadAuth\":\"auth\",\"UploadAddress\":\"address\"}");});
        doReturn("https://cdn.example/episode.mp4").when(media).readyMedia(anyString(),anyString());
        when(media.verify(anyLong(),anyLong(),anyInt(),anyString(),anyString())).thenAnswer(invocation->new CreatorMediaGateway.Published(invocation.getArgument(0),invocation.getArgument(1),invocation.getArgument(2),"episode"));
    }
    CreatorEpisodeService.UploadInput input(int number){return new CreatorEpisodeService.UploadInput(number,"Episode","story","episode.mp4",1024);}
    String create(int number){return ((Map<?,?>)service.create(owner,"a",input(number),"Bearer fixture")).get("submissionId").toString();}
    CreatorEpisodeService.SubmitInput submission(int version){return new CreatorEpisodeService.SubmitInput("Episode","story","https://cdn.example/cover.jpg","delivery",version);}
    String approved(int number){String id=create(number);service.submit(owner,"a",id,submission(0));service.review(admin,"a",id,new CreatorEpisodeService.ReviewInput("APPROVED","accepted",1));return id;}
    String state(String id){return jdbc.queryForObject("SELECT state FROM cms_creator_episode_submission WHERE id=?",String.class,id);}
    @Test void rejectsWrongOwnerRoleStageAndEpisodeBeforeIssuingCloudAuth(){
        assertThatThrownBy(()->service.create(other,"a",input(1),"Bearer fixture")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.detail(other,"a",false)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.detail(owner,"a",true)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.create(owner,"pending",input(1),"Bearer fixture")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.create(owner,"a",input(3),"Bearer fixture")).isInstanceOf(ApiException.class);
        verifyNoInteractions(media);
    }
    @Test void submittingDoesNotPublishAndRetryIsIdempotentButCannotChangePendingMedia(){
        String id=create(1);service.submit(owner,"a",id,submission(0));service.submit(owner,"a",id,submission(0));
        assertThat(state(id)).isEqualTo("SUBMITTED");
        assertThat(jdbc.queryForObject("SELECT lock_version FROM cms_creator_episode_submission WHERE id=?",Integer.class,id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_publication",Integer.class)).isZero();
        assertThatThrownBy(()->create(1)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.review(owner,"a",id,new CreatorEpisodeService.ReviewInput("APPROVED","no",1))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->projects.deliver(owner,"a",new CreatorProductionService.DeliveryInput(List.of(12L),"bypass",0),"Bearer fixture")).hasMessageContaining("逐集交付");
    }
    @Test void processingFailureLeavesDraftAndReviewCanReturnThenResubmit(){
        String id=create(1);when(media.readyMedia(anyString(),anyString())).thenThrow(ApiException.conflict("processing"));
        assertThatThrownBy(()->service.submit(owner,"a",id,submission(0))).isInstanceOf(ApiException.class);assertThat(state(id)).isEqualTo("DRAFT");
        doReturn("https://cdn.example/episode.mp4").when(media).readyMedia(anyString(),anyString());
        service.submit(owner,"a",id,submission(0));service.review(admin,"a",id,new CreatorEpisodeService.ReviewInput("CHANGES_REQUESTED","revise",1));
        assertThatThrownBy(()->service.submit(owner,"a",id,submission(0))).isInstanceOf(ApiException.class);
        service.submit(owner,"a",id,submission(2));assertThat(state(id)).isEqualTo("SUBMITTED");
    }
    @Test void metadataSurvivesCloudProcessingAndSameRevisionCanResume(){
        String id=create(1);
        service.metadata(owner,"a",id,submission(0));
        doThrow(new ApiException(org.springframework.http.HttpStatus.CONFLICT,"MEDIA_PROCESSING","processing")).when(media).readyMedia(anyString(),anyString());
        assertThatThrownBy(()->service.submit(owner,"a",id,submission(1))).isInstanceOf(ApiException.class);
        assertThat(state(id)).isEqualTo("DRAFT");
        assertThat(jdbc.queryForObject("SELECT cover_url FROM cms_creator_episode_submission WHERE id=?",String.class,id)).isEqualTo(submission(0).coverUrl());
        assertThat(jdbc.queryForObject("SELECT lock_version FROM cms_creator_episode_submission WHERE id=?",Integer.class,id)).isEqualTo(1);
        doReturn("https://cdn.example/episode.mp4").when(media).readyMedia(anyString(),anyString());
        service.submit(owner,"a",id,submission(1));assertThat(state(id)).isEqualTo("SUBMITTED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_submission WHERE script_id='a'",Integer.class)).isEqualTo(1);
        verify(media,times(1)).create(anyString(),anyString(),anyString());
    }
    @Test void metadataCannotModifyAnotherOwnerOldVersionOrSubmittedContent(){
        String id=create(1);
        assertThatThrownBy(()->service.metadata(other,"a",id,submission(0))).isInstanceOf(ApiException.class);
        service.metadata(owner,"a",id,submission(0));
        assertThatThrownBy(()->service.metadata(owner,"a",id,submission(0))).isInstanceOf(ApiException.class);
        service.submit(owner,"a",id,submission(1));
        assertThatThrownBy(()->service.metadata(owner,"a",id,submission(2))).isInstanceOf(ApiException.class);
        assertThat(state(id)).isEqualTo("SUBMITTED");
    }
    @Test void acceptedEpisodeCannotBeReuploadedAndInvalidRelinkPreservesPublication(){
        String first=approved(1);service.link(admin,"a",first,new CreatorEpisodeService.PublicationInput(7,90,2));
        assertThatThrownBy(()->create(1)).hasMessageContaining("不可重複上傳");
        assertThat(state(first)).isEqualTo("APPROVED");
        when(media.verify(anyLong(),eq(91L),anyInt(),anyString(),anyString())).thenThrow(ApiException.conflict("wrong media"));
        assertThatThrownBy(()->service.link(admin,"a",first,new CreatorEpisodeService.PublicationInput(7,91,2))).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT submission_id FROM cms_creator_episode_publication WHERE script_id='a'",String.class)).isEqualTo(first);
        assertThat(jdbc.queryForObject("SELECT app_episode_id FROM cms_creator_episode_publication WHERE script_id='a'",Long.class)).isEqualTo(90);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_submission",Integer.class)).isEqualTo(1);
    }
    @Test void plannedEpisodesMustAllBeAcceptedAndLinkedBeforeProjectCompletion(){
        String first=approved(1);service.link(admin,"a",first,new CreatorEpisodeService.PublicationInput(7,90,2));
        assertThatThrownBy(()->service.complete(admin,"a",new CreatorEpisodeService.CompleteInput("done",0))).isInstanceOf(ApiException.class);
        String second=approved(2);
        assertThatThrownBy(()->service.link(admin,"a",second,new CreatorEpisodeService.PublicationInput(8,92,2))).hasMessageContaining("同一 App");
        assertThatThrownBy(()->service.link(admin,"a",second,new CreatorEpisodeService.PublicationInput(7,90,2))).hasMessageContaining("其他項目或集數");
        service.link(admin,"a",second,new CreatorEpisodeService.PublicationInput(7,92,2));
        assertThatThrownBy(()->service.complete(owner,"a",new CreatorEpisodeService.CompleteInput("done",0))).isInstanceOf(ApiException.class);
        service.complete(admin,"a",new CreatorEpisodeService.CompleteInput("done",0));
        assertThat(jdbc.queryForObject("SELECT production_stage FROM cms_creator_script WHERE id='a'",String.class)).isEqualTo("COMPLETED");
        assertThatThrownBy(()->create(1)).isInstanceOf(ApiException.class);
    }
    @Test void statusRecheckDistinguishesNetworkFailureFromMissingOrWrongEpisode(){
        String id=approved(1);service.link(admin,"a",id,new CreatorEpisodeService.PublicationInput(7,90,2));
        when(media.verify(anyLong(),anyLong(),anyInt(),anyString(),anyString())).thenThrow(ApiException.unavailable("network"));
        assertThat(((Map<?,?>)((List<?>)service.check(owner,"a",false,1)).get(0)).get("status")).isEqualTo("UNKNOWN");
        doThrow(ApiException.conflict("missing")).when(media).verify(anyLong(),anyLong(),anyInt(),anyString(),anyString());
        assertThat(((Map<?,?>)((List<?>)service.check(owner,"a",false,1)).get(0)).get("status")).isEqualTo("UNAVAILABLE");
    }
    @Test void deletedDramaUnlocksAllAffectedEpisodesAndNotifiesOnlyOnce(){
        String first=approved(1),second=approved(2);service.link(admin,"a",first,new CreatorEpisodeService.PublicationInput(7,90,2));service.link(admin,"a",second,new CreatorEpisodeService.PublicationInput(7,92,2));
        service.complete(admin,"a",new CreatorEpisodeService.CompleteInput("done",0));
        doThrow(new ApiException(org.springframework.http.HttpStatus.CONFLICT,"PUBLICATION_DELETED","deleted")).when(media).verify(anyLong(),anyLong(),anyInt(),anyString(),anyString());
        jdbc.update("UPDATE cms_creator_publication_check SET checked_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 MINUTE)");
        new CreatorPublicationMonitor(jdbc,service).scan();new CreatorPublicationMonitor(jdbc,service).scan();
        assertThat(state(first)).isEqualTo("ARCHIVED");assertThat(state(second)).isEqualTo("ARCHIVED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_publication",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event WHERE note LIKE '%本集已解鎖%'",Integer.class)).isEqualTo(2);
        String next=create(1);assertThat(state(next)).isEqualTo("DRAFT");assertThat(state(first)).isEqualTo("ARCHIVED");
        assertThatThrownBy(()->service.submit(owner,"a",first,submission(3))).isInstanceOf(ApiException.class);
    }
    @Test void missingOfflineAndNetworkDoNotUnlockOrSpamNotifications(){
        String first=approved(1);service.link(admin,"a",first,new CreatorEpisodeService.PublicationInput(7,90,2));
        for(String code:List.of("MISSING","OFFLINE","MISMATCH")){
            doThrow(new ApiException(org.springframework.http.HttpStatus.CONFLICT,"PUBLICATION_"+code,code)).when(media).verify(anyLong(),anyLong(),anyInt(),anyString(),anyString());
            jdbc.update("UPDATE cms_creator_publication_check SET checked_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 10 MINUTE)");
        new CreatorPublicationMonitor(jdbc,service).scan();new CreatorPublicationMonitor(jdbc,service).scan();
            assertThatThrownBy(()->create(1)).isInstanceOf(ApiException.class);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event WHERE note LIKE '%App 上架異常%'",Integer.class)).isEqualTo(3);
        assertThatThrownBy(()->service.confirmDeletion(owner,"a",new CreatorEpisodeService.DeletionInput(1,first,7,90))).isInstanceOf(ApiException.class);
        service.confirmDeletion(admin,"a",new CreatorEpisodeService.DeletionInput(1,first,7,90));
        assertThat(state(create(1))).isEqualTo("DRAFT");
    }
}
