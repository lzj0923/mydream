package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;

@EnabledIfEnvironmentVariable(named="PUBLICATION_TEST_DB",matches="jdbc:mysql://127.0.0.1:3309/creator_publication_test(?:\\?.*)?")
class CreatorPublicationChecksIntegrationTest {
 @Test void migrationPersistsHistoryAndNeverAppliesOldResultsToNewLinks(){
  var ds=new DriverManagerDataSource(System.getenv("PUBLICATION_TEST_DB"),"root","");var jdbc=new JdbcTemplate(ds);
  jdbc.execute("DROP TABLE IF EXISTS cms_creator_publication_check");
  jdbc.execute("DROP TABLE IF EXISTS cms_creator_episode_publication");
  jdbc.execute("CREATE TABLE cms_creator_episode_publication(script_id CHAR(36),episode_number INT,submission_id CHAR(36),app_drama_id BIGINT,app_episode_id BIGINT,app_title VARCHAR(100),verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  new ResourceDatabasePopulator(new ClassPathResource("db/migration/V38__creator_publication_checks.sql")).execute(ds);
  jdbc.execute("DROP TABLE IF EXISTS cms_creator_project_event");jdbc.execute("DROP TABLE IF EXISTS cms_creator_script");
  jdbc.execute("CREATE TABLE cms_creator_script(id CHAR(36) PRIMARY KEY,production_stage VARCHAR(30)) ENGINE=InnoDB");
  jdbc.execute("CREATE TABLE cms_creator_project_event(id CHAR(36) PRIMARY KEY,script_id CHAR(36),actor_key VARCHAR(191),stage VARCHAR(30),note TEXT) ENGINE=InnoDB");
  jdbc.update("INSERT INTO cms_creator_script VALUES ('p','PRODUCING')");
  var service=new CreatorPublicationChecks(jdbc);var viewer=new CreatorAccess.Viewer("admin:test","Tester",true);
  var row=Map.<String,Object>of("episodeNumber",1,"submissionId","s","appDramaId",723L,"appEpisodeId",21222L);
  jdbc.update("INSERT INTO cms_creator_episode_publication(script_id,episode_number,submission_id,app_drama_id,app_episode_id,app_title) VALUES ('p',1,'s',723,21222,'Test')");
  assertThat(service.save(viewer,"p",row,"UNAVAILABLE","missing")).isTrue();
  assertThat(service.publications("p").get(0).get("checkStatus")).isEqualTo("UNAVAILABLE");
  assertThat(service.save(viewer,"p",row,"PUBLISHED","restored")).isTrue();
  assertThat(service.publications("p").get(0).get("checkStatus")).isEqualTo("PUBLISHED");
  assertThat(service.history("p")).hasSize(2);assertThat(service.history("other")).isEmpty();
  jdbc.update("UPDATE cms_creator_episode_publication SET app_episode_id=21223 WHERE script_id='p'");
  assertThat(service.save(viewer,"p",row,"UNAVAILABLE","stale")).isFalse();
  assertThat(service.publications("p").get(0).get("checkStatus")).isNull();
  assertThat(service.history("p")).hasSize(2);
 }
}

