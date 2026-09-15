package com.mydream.cms.creator;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
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
import com.mydream.cms.shared.ApiException;

@EnabledIfEnvironmentVariable(named="CREATOR_AGREEMENT_TEST_DB",matches="jdbc:mysql://127.0.0.1:(?:3309|3317)/creator_agreement_test(?:\\?.*)?")
class CreatorAgreementIntegrationTest {
    JdbcTemplate jdbc;CreatorAgreementService service;
    final CreatorAccess.Viewer owner=new CreatorAccess.Viewer("app:452","Writer",false),other=new CreatorAccess.Viewer("app:453","Other",false),admin=new CreatorAccess.Viewer("admin:test","Admin",true);
    @BeforeEach void setup(){
        var ds=new DriverManagerDataSource(System.getenv("CREATOR_AGREEMENT_TEST_DB"),"root","");jdbc=new JdbcTemplate(ds);
        for(String table:List.of("cms_creator_agreement","cms_creator_agreement_template","cms_creator_project_event","cms_creator_delivery","cms_creator_script"))jdbc.execute("DROP TABLE IF EXISTS "+table);
        jdbc.execute("CREATE TABLE cms_creator_script(id CHAR(36) PRIMARY KEY,owner_key VARCHAR(191),title VARCHAR(120),status VARCHAR(20),episode_count INT DEFAULT 2,lock_version INT DEFAULT 0,reviewed_at TIMESTAMP NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V26__creator_production.sql"),new ClassPathResource("db/migration/V28__creator_agreements.sql")).execute(ds);
        jdbc.update("INSERT INTO cms_creator_script(id,owner_key,title,status) VALUES ('a','app:452','Story A','APPROVED'),('b','app:453','Story B','APPROVED'),('draft','app:452','Draft','SUBMITTED')");
        var proxy=new ProxyFactory(new CreatorAgreementService(jdbc));proxy.setProxyTargetClass(true);proxy.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(ds),new AnnotationTransactionAttributeSource()));service=(CreatorAgreementService)proxy.getProxy();
    }
    CreatorAgreementService.SubmitInput input(String scope,int template,int attempt){return new CreatorAgreementService.SubmitInput(scope,template,attempt,"Writer","writer@example.test",true,true);}
    Map<?,?> submit(String scope){return (Map<?,?>)service.submit(owner,input(scope,1,0));}
    void approve(String id){service.review(admin,id,new CreatorAgreementService.ReviewInput("APPROVED","checked demo"));}
    String membership(){String id=submit("membership").get("id").toString();approve(id);return id;}
    @Test void membershipThenProjectConfirmationUnlocksProductionWithoutAppWrites(){
        assertThatThrownBy(()->service.requireMembership(owner)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->submit("a")).isInstanceOf(ApiException.class);
        var member=submit("membership");assertThat(member.get("state")).isEqualTo("PENDING");
        assertThatThrownBy(()->service.requireMembership(owner)).isInstanceOf(ApiException.class);
        approve(member.get("id").toString());service.requireMembership(owner);
        var project=submit("a");assertThatThrownBy(()->service.requireProject(owner,"a")).isInstanceOf(ApiException.class);
        approve(project.get("id").toString());service.requireProject(owner,"a");
        assertThat(jdbc.queryForObject("SELECT production_stage FROM cms_creator_script WHERE id='a'",String.class)).isEqualTo("PRODUCING");
        assertThat(jdbc.queryForObject("SELECT contract_reference FROM cms_creator_script WHERE id='a'",String.class)).startsWith("DEMO-");
        assertThat(jdbc.queryForObject("SELECT state FROM cms_creator_agreement WHERE id=?",String.class,project.get("id"))).isEqualTo("DEMO_ACTIVE");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event",Integer.class)).isEqualTo(1);
    }
    @Test void returnedApplicationPreservesOldSnapshotAndRequiresRereadingLatestTemplate(){
        var first=submit("membership");String id=first.get("id").toString(),hash=first.get("documentHash").toString();
        service.review(admin,id,new CreatorAgreementService.ReviewInput("CHANGES_REQUESTED","please correct name"));
        service.template(admin,"MEMBERSHIP",new CreatorAgreementService.TemplateInput("Revised demo","Updated placeholder body",1));
        assertThatThrownBy(()->service.submit(owner,input("membership",1,1))).hasMessageContaining("模板已更新");
        var second=(Map<?,?>)service.submit(owner,input("membership",2,1));
        assertThat(second.get("attempt")).isEqualTo(2);assertThat(second.get("body")).isEqualTo("Updated placeholder body");
        var old=jdbc.queryForMap("SELECT body,document_hash,review_note,state FROM cms_creator_agreement WHERE id=?",id);
        assertThat(old.get("document_hash")).isEqualTo(hash);assertThat(old.get("body")).isEqualTo(first.get("body"));assertThat(old.get("review_note")).isEqualTo("please correct name");
        assertThatThrownBy(()->approve(id)).isInstanceOf(ApiException.class);
    }
    @Test void anotherOwnerAndUnapprovedOrClosedProjectsCannotBeSigned(){
        membership();
        assertThatThrownBy(()->submit("b")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->submit("draft")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.submit(other,input("a",1,0))).isInstanceOf(ApiException.class);
        jdbc.update("UPDATE cms_creator_script SET production_stage='COMPLETED' WHERE id='a'");
        assertThatThrownBy(()->submit("a")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.requireProject(other,"a")).isInstanceOf(ApiException.class);
        assertThat(((List<?>)((Map<?,?>)service.list(other,false)).get("contracts"))).isEmpty();
    }
    @Test void noDuplicateSigningSelfApprovalOrTemplateOverwrite(){
        var first=submit("membership");String id=first.get("id").toString();
        assertThatThrownBy(()->submit("membership")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.submit(owner,input("membership",1,1))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.review(owner,id,new CreatorAgreementService.ReviewInput("APPROVED","self"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.list(owner,true)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.template(owner,"MEMBERSHIP",new CreatorAgreementService.TemplateInput("x","y",1))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.template(admin,"MEMBERSHIP",new CreatorAgreementService.TemplateInput("x","y",2))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.submit(admin,input("membership",1,0))).isInstanceOf(ApiException.class);
        approve(id);assertThatThrownBy(()->approve(id)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.submit(owner,input("membership",1,1))).isInstanceOf(ApiException.class);
    }
    @Test void failedProjectConfirmationRollsBackAndKeepsPendingRecord(){
        membership();var c=submit("a");jdbc.update("UPDATE cms_creator_script SET status='CHANGES_REQUESTED' WHERE id='a'");
        assertThatThrownBy(()->approve(c.get("id").toString())).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT state FROM cms_creator_agreement WHERE id=?",String.class,c.get("id"))).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_project_event",Integer.class)).isZero();
    }
    @Test void controllerGuardsRejectBeforeScriptOrCloudUploadServices(){
        var access=mock(CreatorAccess.class);var request=mock(jakarta.servlet.http.HttpServletRequest.class);
        when(access.require(request,null)).thenReturn(owner);
        var scripts=mock(CreatorService.class);var episodes=mock(CreatorEpisodeService.class);var production=mock(CreatorProductionService.class);
        var scriptController=new CreatorController(access,scripts,service);
        scriptController.create(null,request,null);verify(scripts).create(owner,null);
        var episodeController=new CreatorEpisodeController(access,episodes,service);
        assertThatThrownBy(()->episodeController.upload("a",null,request,null)).isInstanceOf(ApiException.class);
        var projectController=new CreatorProductionController(access,production,service);
        assertThatThrownBy(()->projectController.deliver("a",null,request,null)).isInstanceOf(ApiException.class);
        verifyNoInteractions(episodes,production);
        membership();var contract=submit("a");approve(contract.get("id").toString());
        episodeController.upload("a",null,request,null);verify(episodes).create(owner,"a",null,null);
    }
    @Test void acknowledgementsAndReviewDecisionAreValidated(){
        assertThatThrownBy(()->service.submit(owner,new CreatorAgreementService.SubmitInput("membership",1,0,"Writer","contact",true,false))).isInstanceOf(ApiException.class);
        var c=submit("membership");
        assertThatThrownBy(()->service.review(admin,c.get("id").toString(),new CreatorAgreementService.ReviewInput("SIGNED","invalid"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.review(admin,c.get("id").toString(),new CreatorAgreementService.ReviewInput("APPROVED",""))).isInstanceOf(ApiException.class);
    }
}
