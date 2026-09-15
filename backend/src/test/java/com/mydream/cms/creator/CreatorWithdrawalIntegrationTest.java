package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockHttpServletRequest;
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named="CREATOR_WITHDRAWAL_TEST_DB",matches="jdbc:mysql://127.0.0.1:3309/creator_withdrawal_test(?:\\?.*)?")
class CreatorWithdrawalIntegrationTest {
 @Test void databaseClaimSurvivesConcurrentRequestsAndUncertainResult() throws Exception {
  var ds=new DriverManagerDataSource(System.getenv("CREATOR_WITHDRAWAL_TEST_DB"),"root","");var jdbc=new JdbcTemplate(ds);
  for(String table:List.of("cms_creator_withdrawal_request","cms_creator_withdrawal_gate","cms_creator_bank_account"))jdbc.execute("DROP TABLE IF EXISTS "+table);
  new ResourceDatabasePopulator(new ClassPathResource("db/migration/V36__creator_withdrawal_requests.sql")).execute(ds);
  jdbc.execute("CREATE TABLE cms_creator_bank_account(account_id VARCHAR(36) PRIMARY KEY,payload_encrypted TEXT,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  var cipher=new PiiCipher(new CmsProperties(null,null,null,null,null,Base64.getEncoder().encodeToString(new byte[32]),null,null,null,null));
  var accounts=mock(CreatorAccountService.class);var owner=new CreatorAccountService.Account("owner","writer","Writer",1L,"app",null);
  when(accounts.require("session")).thenReturn(owner);when(accounts.appSession("session")).thenReturn(new CreatorAccountService.AppSession(1,"mock-token"));when(accounts.login("writer","password123")).thenReturn(new CreatorAccountService.Login("temp",60,owner));
  var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var writes=new AtomicInteger();
  var newApiCalls=new AtomicInteger();
  var sentBody=new java.util.concurrent.atomic.AtomicReference<String>();
  var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  server.createContext("/api/user/userInfo",x->{byte[] bytes="{\"code\":1,\"data\":{\"id\":1}}".getBytes();x.sendResponseHeaders(200,bytes.length);x.getResponseBody().write(bytes);x.close();});
  server.createContext("/api/user/userWithdrawal",x->{sentBody.set(new String(x.getRequestBody().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8));writes.incrementAndGet();entered.countDown();try{release.await(10,TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}byte[] bytes="invalid response".getBytes();x.sendResponseHeaders(200,bytes.length);x.getResponseBody().write(bytes);x.close();});server.createContext("/api/user/getCreatorWithdrawalRequest",x->{
   newApiCalls.incrementAndGet();x.sendResponseHeaders(404,-1);x.close();
  });server.start();
  var pool=Executors.newSingleThreadExecutor();
  try{
   var controller=new CreatorWithdrawalController(accounts,jdbc,cipher,new ObjectMapper(),new DataSourceTransactionManager(ds),"http://127.0.0.1:"+server.getAddress().getPort());
   var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer session");
   var bankController=new CreatorBankAccountController(accounts,jdbc,cipher,new ObjectMapper());
   var bankResult=bankController.bind(new CreatorBankAccountController.Binding("Synthetic","Mock Bank","","123456789012","123456789012","password123"),request);
   assertThat(bankResult.toString()).contains("9012").doesNotContain("123456789012");
   assertThat(jdbc.queryForObject("SELECT payload_encrypted FROM cms_creator_bank_account",String.class)).doesNotContain("123456789012");
   var input=new CreatorWithdrawalController.Input(UUID.randomUUID().toString(),10,"password123","•••• 9012",true);
   var first=pool.submit(()->controller.submit(input,request));assertThat(entered.await(5,TimeUnit.SECONDS)).isTrue();
   assertThat(controller.submit(input,request).toString()).contains("SENDING");
   var next=new CreatorWithdrawalController.Input(UUID.randomUUID().toString(),10,"password123","•••• 9012",true);
   assertThatThrownBy(()->controller.submit(next,request)).isInstanceOf(ApiException.class);
   release.countDown();assertThat(first.get(5,TimeUnit.SECONDS).toString()).contains("UNKNOWN");
   assertThat(controller.submit(input,request).toString()).contains("UNKNOWN");
   assertThatThrownBy(()->controller.submit(next,request)).isInstanceOf(ApiException.class);
   assertThat(controller.status(request).toString()).contains("UNKNOWN");
   assertThat(controller.status(request).toString()).contains("UNKNOWN");
   assertThat(newApiCalls.get()).isZero();
   assertThat(sentBody.get()).contains("withdrawal_type=1","withdrawal_method=2","amount=10").doesNotContain("creator_request_id");
   assertThat(writes.get()).isEqualTo(1);assertThat(jdbc.queryForObject("SELECT state FROM cms_creator_withdrawal_request",String.class)).isEqualTo("UNKNOWN");
  }finally{release.countDown();pool.shutdownNow();server.stop(0);}
 }
}
