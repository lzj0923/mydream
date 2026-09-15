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

@EnabledIfEnvironmentVariable(named="CREATOR_TEAM_DRAFT_TEST_DB",matches="jdbc:mysql://127.0.0.1:3309/creator_team_draft_test(?:\\?.*)?")
class CreatorTeamDraftIntegrationTest {
    JdbcTemplate jdbc; CreatorEpisodeService service; CreatorProductionService projects; CreatorMediaGateway media;
    final CreatorAccess.Viewer owner=new CreatorAccess.Viewer("app:452","Writer",false),other=new CreatorAccess.Viewer("app:453","Other",false),admin=new CreatorAccess.Viewer("admin:test","Admin",true);
    @BeforeEach void setup(){
        var ds=new DriverManagerDataSource(System.getenv("CREATOR_TEAM_DRAFT_TEST_DB"),"root","");jdbc=new JdbcTemplate(ds);
        for(String name:List.of("cms_creator_project_settings","cms_creator_episode_publication","cms_creator_episode_submission","cms_creator_project_event","cms_creator_delivery","cms_creator_script"))jdbc.execute("DROP TABLE IF EXISTS "+name);
        jdbc.execute("CREATE TABLE cms_creator_script(id CHAR(36) PRIMARY KEY,owner_key VARCHAR(191),title VARCHAR(120),genre VARCHAR(40),format VARCHAR(40),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,status VARCHAR(20),episode_count INT NOT NULL DEFAULT 2,synopsis TEXT,body MEDIUMTEXT,lock_version INT DEFAULT 0,reviewed_at TIMESTAMP NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V26__creator_production.sql"),new ClassPathResource("db/migration/V27__creator_episode_submissions.sql"),new ClassPathResource("db/migration/V32__creator_project_settings.sql")).execute(ds);
        jdbc.update("INSERT INTO cms_creator_script(id,owner_key,title,status,production_stage,synopsis,body) VALUES ('a','app:452','A','APPROVED','PRODUCING','story','script'),('b','app:453','B','APPROVED','PRODUCING','story','script'),('pending','app:452','Pending','APPROVED','PENDING_CONTRACT','','')");
        jdbc.update("INSERT INTO cms_creator_project_settings(project_id,area,category_id,landscape,unlock_price) VALUES ('a','zhf','22',0,0)");
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
    @Test void uploadedDraftPersistsAndSubmitsOnce(){
        String id=create(1);service.draft(owner,"a",id,submission(0));service.draft(owner,"a",id,submission(0));
        assertThat(state(id)).isEqualTo("DRAFT");assertThat(jdbc.queryForObject("SELECT lock_version FROM cms_creator_episode_submission WHERE id=?",Integer.class,id)).isEqualTo(1);
        assertThatThrownBy(()->service.submit(other,"a",id,submission(1))).isInstanceOf(ApiException.class);
        service.submit(owner,"a",id,submission(1));service.submit(owner,"a",id,submission(1));assertThat(state(id)).isEqualTo("SUBMITTED");
        assertThatThrownBy(()->service.draft(owner,"a",id,submission(2))).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event",Integer.class)).isEqualTo(2);
    }
    @Test void failedProcessingDoesNotPretendDraftIsReady(){
        String id=create(1);doThrow(ApiException.conflict("processing")).when(media).readyMedia(anyString(),anyString());
        assertThatThrownBy(()->service.draft(owner,"a",id,submission(0))).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT lock_version FROM cms_creator_episode_submission WHERE id=?",Integer.class,id)).isZero();
    }
}
