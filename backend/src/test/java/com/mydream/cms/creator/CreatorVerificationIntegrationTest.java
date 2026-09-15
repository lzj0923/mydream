package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.forms.PiiCipher;
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
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named="CREATOR_VERIFICATION_TEST_DB",matches="jdbc:mysql://127.0.0.1:3309/creator_verification_test(?:\\?.*)?")
class CreatorVerificationIntegrationTest {
 JdbcTemplate jdbc;CreatorVerificationService service;
 final CreatorAccess.Viewer owner=new CreatorAccess.Viewer("creator:account-a","Synthetic Writer",false),other=new CreatorAccess.Viewer("creator:account-b","Other",false),admin=new CreatorAccess.Viewer("admin:reviewer","Reviewer",true);
 @BeforeEach void setup(){
  var ds=new DriverManagerDataSource(System.getenv("CREATOR_VERIFICATION_TEST_DB"),"root","");jdbc=new JdbcTemplate(ds);
  for(String table:List.of("cms_creator_verification_event","cms_creator_verification","cms_creator_session","cms_creator_account"))jdbc.execute("DROP TABLE IF EXISTS "+table);
  new ResourceDatabasePopulator(new ClassPathResource("db/migration/V29__creator_accounts.sql"),new ClassPathResource("db/migration/V30__creator_verification.sql"),new ClassPathResource("db/migration/V31__creator_verification_large_images.sql")).execute(ds);
  jdbc.update("INSERT INTO cms_creator_account(id,username,password_hash,display_name) VALUES ('account-a','test_a','unused','Synthetic'),('account-b','test_b','unused','Synthetic')");
  var cipher=new PiiCipher(new CmsProperties(null,null,null,null,null,Base64.getEncoder().encodeToString(new byte[32]),null,null,null,null));
  var proxy=new ProxyFactory(new CreatorVerificationService(jdbc,cipher,new ObjectMapper()));proxy.setProxyTargetClass(true);proxy.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(ds),new AnnotationTransactionAttributeSource()));service=(CreatorVerificationService)proxy.getProxy();
 }
 CreatorVerificationService.Document picture(){return new CreatorVerificationService.Document("synthetic.png","data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=");}
 CreatorVerificationService.Input input(String role,String entity,int version){return new CreatorVerificationService.Input(role,entity,"Synthetic Only","TEST-ONLY-123","Test Contact","test@example.invalid","Test Region",entity.equals("PERSONAL")?List.of(picture(),picture()):List.of(picture()),true,version);}
 int version(Map<String,Object> value){return ((Number)value.get("version")).intValue();}
 @Test void storesThreeFiveMiBImagesAndReadsThemForReview(){
  byte[] bytes=new byte[5*1024*1024];bytes[0]=(byte)255;bytes[1]=(byte)216;bytes[2]=(byte)255;
  String data="data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(bytes);
  var docs=List.of(new CreatorVerificationService.Document("front",data,"ID_FRONT"),new CreatorVerificationService.Document("back",data,"ID_BACK"),new CreatorVerificationService.Document("handheld",data,"HANDHELD"));
  var profile=Map.of("documentType","ID_CARD","displayName","Synthetic","email","test@example.invalid","phone","+886 900000000","city","Test","introduction","Synthetic only");
  var input=new CreatorVerificationService.Input("COMIC","PERSONAL","Test","TEST","Test","test@example.invalid","Test",docs,true,0,profile);
  var result=service.submit(owner,input);
  assertThat(result.get("state")).isEqualTo("PENDING");
  var payload=(tools.jackson.databind.JsonNode)service.detail(admin,result.get("id").toString()).get("payload");
  assertThat(payload.get("documents").size()).isEqualTo(3);
  assertThat(payload.get("documents").get(2).get("data").asString()).isEqualTo(data);
 }
 @Test void personalAndBusinessBothRolesSubmitWithoutApprovalAndProtectSensitiveData(){
  assertThat(service.status(owner).get("state")).isEqualTo("NONE");
  for(String role:List.of("COMIC","SHORT_DRAMA"))for(String entity:List.of("PERSONAL","BUSINESS")){
   var viewer=role.equals("COMIC")?owner:other;var current=service.status(viewer);
   if(!current.get("state").equals("NONE")){service.review(admin,current.get("id").toString(),new CreatorVerificationService.Decision("REJECTED","Synthetic correction",version(current)));current=service.status(viewer);}
   var submitted=service.submit(viewer,input(role,entity,version(current)));assertThat(submitted.get("state")).isEqualTo("PENDING");
   assertThat(submitted).doesNotContainKeys("payload","payload_encrypted","documentNumber");assertThatThrownBy(()->service.requireApproved(viewer)).isInstanceOf(ApiException.class);
  }
  assertThat(jdbc.queryForObject("SELECT payload_encrypted FROM cms_creator_verification WHERE owner_key=?",String.class,owner.ownerKey())).doesNotContain("TEST-ONLY","Synthetic","data:image");
  assertThat(service.list(admin).get(0)).doesNotContainKeys("payload_encrypted","payload");
 }
 @Test void rejectResubmitApproveAndOptimisticReview(){
  var pending=service.submit(owner,input("COMIC","PERSONAL",0));String id=pending.get("id").toString();
  assertThatThrownBy(()->service.submit(owner,input("COMIC","PERSONAL",0))).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->service.review(admin,id,new CreatorVerificationService.Decision("REJECTED","",1))).isInstanceOf(ApiException.class);
  service.review(admin,id,new CreatorVerificationService.Decision("REJECTED","Please provide clear pictures",1));
  assertThat(service.status(owner).get("state")).isEqualTo("REJECTED");assertThatThrownBy(()->service.requireApproved(owner)).isInstanceOf(ApiException.class);
  var again=service.submit(owner,input("SHORT_DRAMA","BUSINESS",2));assertThat(version(again)).isEqualTo(3);
  assertThatThrownBy(()->service.review(admin,id,new CreatorVerificationService.Decision("APPROVED","",1))).isInstanceOf(ApiException.class);
  service.review(admin,id,new CreatorVerificationService.Decision("APPROVED","",3));service.requireApproved(owner);
  assertThatThrownBy(()->service.review(admin,id,new CreatorVerificationService.Decision("REJECTED","stale",3))).isInstanceOf(ApiException.class);
  assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_verification_event",Integer.class)).isEqualTo(4);
 }
 @Test void creatorCannotReadOthersMaterialsOrReviewAndInvalidFilesDoNotPersist(){
  var pending=service.submit(owner,input("COMIC","PERSONAL",0));String id=pending.get("id").toString();
  assertThatThrownBy(()->service.detail(other,id)).isInstanceOf(ApiException.class);assertThatThrownBy(()->service.list(owner)).isInstanceOf(ApiException.class);
  assertThatThrownBy(()->service.review(owner,id,new CreatorVerificationService.Decision("APPROVED","",1))).isInstanceOf(ApiException.class);
  assertThat(service.detail(admin,id).get("payload").toString()).contains("TEST-ONLY-123");
  var invalid=new CreatorVerificationService.Input("SHORT_DRAMA","BUSINESS","Synthetic","TEST","Contact","test@example.invalid","Test",List.of(new CreatorVerificationService.Document("x.svg","data:image/svg+xml;base64,PHN2Zz4=")),true,0);
  assertThatThrownBy(()->service.submit(other,invalid)).isInstanceOf(ApiException.class);assertThat(service.status(other).get("state")).isEqualTo("NONE");
 }
 @Test void draftsAndScriptSubmissionRemainAvailableWhilePublicationRequiresApproval(){
  var access=mock(CreatorAccess.class);var request=mock(jakarta.servlet.http.HttpServletRequest.class);when(access.require(request,null)).thenReturn(owner);
  var scripts=mock(CreatorService.class);var controller=new CreatorController(access,scripts,mock(CreatorAgreementService.class));
  controller.create(null,request,null);controller.update("script",null,request,null);verify(scripts).create(owner,null);verify(scripts).update(owner,"script",null);
  controller.submit("script",new CreatorService.VersionInput(0),request,null);verify(scripts).submit(owner,"script",0);assertThatThrownBy(()->service.requireApproved(owner)).isInstanceOf(ApiException.class);
  var pending=service.submit(owner,input("COMIC","PERSONAL",0));service.review(admin,pending.get("id").toString(),new CreatorVerificationService.Decision("APPROVED","",1));
  service.requireApproved(owner);
 }
}
