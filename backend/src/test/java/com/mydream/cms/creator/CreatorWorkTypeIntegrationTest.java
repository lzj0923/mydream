package com.mydream.cms.creator;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
@EnabledIfEnvironmentVariable(named="CREATOR_WORK_TYPE_TEST_DB",matches="jdbc:mysql://127.0.0.1:3309/creator_work_type_test(?:\\?.*)?")
class CreatorWorkTypeIntegrationTest {
 @Test void migrationPreservesAndClassifiesLegacyProjectsAndPersistsChoice(){
  var ds=new DriverManagerDataSource(System.getenv("CREATOR_WORK_TYPE_TEST_DB"),"root","");var j=new JdbcTemplate(ds);
  for(var t:List.of("cms_creator_work_context","cms_creator_script","cms_creator_ip_interest","cms_creator_cooperation_draft","cms_creator_team_member"))j.execute("DROP TABLE IF EXISTS "+t);
  j.execute("CREATE TABLE cms_creator_script(id VARCHAR(36),owner_key VARCHAR(191),format VARCHAR(40),status VARCHAR(20)) CHARACTER SET utf8mb4");
  j.execute("CREATE TABLE cms_creator_ip_interest(owner_key VARCHAR(191),work_slug VARCHAR(180),format VARCHAR(40),UNIQUE KEY uk_creator_interest(owner_key,work_slug)) CHARACTER SET utf8mb4");
  j.execute("CREATE TABLE cms_creator_cooperation_draft(id VARCHAR(36))");j.execute("CREATE TABLE cms_creator_team_member(company_owner VARCHAR(36),account_id VARCHAR(36),state VARCHAR(20))");
  j.update("INSERT INTO cms_creator_script VALUES ('1','creator:owner','AI 短剧','ACTIVE'),('2','creator:owner','真人短剧','ACTIVE'),('3','creator:owner','旧未知','ACTIVE')");
  new ResourceDatabasePopulator(new ClassPathResource("db/migration/V42__creator_work_types.sql")).execute(ds);
  assertThat(j.queryForList("SELECT work_type FROM cms_creator_script ORDER BY id",String.class)).containsExactly("COMIC","SHORT_DRAMA","UNCLASSIFIED");
  var teams=mock(CreatorTeamService.class);when(teams.scope("owner")).thenReturn(new CreatorTeamService.Scope("owner",false,true,true,true));
  var types=new CreatorWorkTypeService(j,teams);assertThat(types.current("owner")).isEqualTo(CreatorWorkType.COMIC);
  types.select("owner","SHORT_DRAMA");assertThat(new CreatorWorkTypeService(j,teams).current("owner")).isEqualTo(CreatorWorkType.SHORT_DRAMA);
  assertThatThrownBy(()->types.select("owner","OTHER")).isInstanceOf(com.mydream.cms.shared.ApiException.class);
  assertThat(j.queryForObject("SELECT COUNT(*) FROM cms_creator_script",Integer.class)).isEqualTo(3);
 }
}
