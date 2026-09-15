package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.mydream.cms.shared.ApiException;
import java.util.*;
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

@EnabledIfEnvironmentVariable(named="CREATOR_TEST_DB",matches="jdbc:mysql://127.0.0.1:(?:3309|3317)/creator_production_test(?:\\?.*)?")
class CreatorProductionIntegrationTest {
 JdbcTemplate jdbc;CreatorProductionService service;CreatorVideoLookup lookup;
 final CreatorAccess.Viewer owner=new CreatorAccess.Viewer("app:452","Writer",false),other=new CreatorAccess.Viewer("app:453","Other",false),admin=new CreatorAccess.Viewer("admin:test","Admin",true);
 @BeforeEach void setup(){
  var ds=new DriverManagerDataSource(System.getenv("CREATOR_TEST_DB"),"root","");jdbc=new JdbcTemplate(ds);
  jdbc.execute("DROP TABLE IF EXISTS cms_creator_project_settings");jdbc.execute("DROP TABLE IF EXISTS cms_creator_episode_publication");jdbc.execute("DROP TABLE IF EXISTS cms_creator_episode_submission");jdbc.execute("DROP TABLE IF EXISTS cms_creator_project_event");jdbc.execute("DROP TABLE IF EXISTS cms_creator_delivery");jdbc.execute("DROP TABLE IF EXISTS cms_creator_script");
  jdbc.execute("CREATE TABLE cms_creator_script(id CHAR(36) PRIMARY KEY,owner_key VARCHAR(191),title VARCHAR(120),genre VARCHAR(40),format VARCHAR(40),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,status VARCHAR(20),episode_count INT DEFAULT 2,synopsis TEXT,body MEDIUMTEXT,lock_version INT DEFAULT 0,reviewed_at TIMESTAMP NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  new ResourceDatabasePopulator(new ClassPathResource("db/migration/V26__creator_production.sql")).execute(ds);
  new ResourceDatabasePopulator(new ClassPathResource("db/migration/V27__creator_episode_submissions.sql"),new ClassPathResource("db/migration/V32__creator_project_settings.sql")).execute(ds);
  jdbc.update("INSERT INTO cms_creator_script(id,owner_key,title,status) VALUES ('a','app:452','A','APPROVED'),('b','app:453','B','APPROVED'),('draft','app:452','Draft','SUBMITTED')");
  lookup=mock(CreatorVideoLookup.class);var target=new CreatorProductionService(jdbc,lookup);var proxy=new ProxyFactory(target);proxy.setProxyTargetClass(true);proxy.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(ds),new AnnotationTransactionAttributeSource()));service=(CreatorProductionService)proxy.getProxy();
 }
 CreatorProductionService.ProgressInput step(String stage,int version){return new CreatorProductionService.ProgressInput(stage,"人工确认",stage.equals("SIGNED")?"OFFLINE-001":"",version);}
 void producing(){service.progress(admin,"a",step("SIGNED",0));service.progress(admin,"a",step("PRODUCING",1));}
 String stage(){return jdbc.queryForObject("SELECT production_stage FROM cms_creator_script WHERE id='a'",String.class);}
 @Test void accessAndStageGuards(){
  assertThat((List<?>)service.list(owner,false)).hasSize(1);
  assertThatThrownBy(()->service.detail(other,"a",false)).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->service.detail(owner,"draft",false)).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->service.list(owner,true)).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->service.progress(owner,"a",step("SIGNED",0))).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->service.progress(admin,"a",step("COMPLETED",0))).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->service.progress(admin,"a",new CreatorProductionService.ProgressInput("SIGNED","note","",0))).isInstanceOf(ApiException.class);
  assertThat(stage()).isEqualTo("PENDING_CONTRACT");
 }
 @Test void fullCycleWithRevisionAndRework(){
  producing();when(lookup.ownedVideos(eq("app:452"),anyString(),anyList())).thenReturn(List.of(new CreatorVideoLookup.Video(123,"Delivered")));
  service.deliver(owner,"a",new CreatorProductionService.DeliveryInput(List.of(123L),"第一版",2),"Bearer fixture");
  assertThat(stage()).isEqualTo("DELIVERED");
  assertThatThrownBy(()->service.progress(admin,"a",step("COMPLETED",2))).isInstanceOf(ApiException.class);
  service.progress(admin,"a",step("PRODUCING",3));
  service.deliver(owner,"a",new CreatorProductionService.DeliveryInput(List.of(123L),"第二版",4),"Bearer fixture");
  service.progress(admin,"a",step("COMPLETED",5));
  assertThat(stage()).isEqualTo("COMPLETED");assertThat(jdbc.queryForObject("SELECT count(*) FROM cms_creator_project_event WHERE script_id='a'",Integer.class)).isEqualTo(6);
  assertThatThrownBy(()->service.deliver(owner,"a",new CreatorProductionService.DeliveryInput(List.of(123L),"duplicate",6),"Bearer fixture")).isInstanceOf(ApiException.class);
 }
 @Test void duplicateVideoRollsBackStageAndPreviousAssociations(){
  producing();jdbc.update("INSERT INTO cms_creator_delivery(script_id,video_id,video_title) VALUES ('a',1,'old'),('b',2,'other')");
  when(lookup.ownedVideos(eq("app:452"),anyString(),anyList())).thenReturn(List.of(new CreatorVideoLookup.Video(2,"conflict")));
  assertThatThrownBy(()->service.deliver(owner,"a",new CreatorProductionService.DeliveryInput(List.of(2L),"revision",2),"Bearer fixture")).isInstanceOf(ApiException.class);
  assertThat(stage()).isEqualTo("PRODUCING");assertThat(jdbc.queryForObject("SELECT video_id FROM cms_creator_delivery WHERE script_id='a'",Long.class)).isEqualTo(1);
  assertThat(jdbc.queryForObject("SELECT lock_version FROM cms_creator_script WHERE id='a'",Integer.class)).isEqualTo(2);
 }
}
