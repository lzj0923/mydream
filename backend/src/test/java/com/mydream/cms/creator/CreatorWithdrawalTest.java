package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import tools.jackson.databind.ObjectMapper;

class CreatorWithdrawalTest {
 @Test void submitsStoredBankForAuthenticatedOwnerAndNeverReplaysClaim() throws Exception {
  exercise("{\"code\":1}","ACCEPTED",1);
 }
 @Test void malformedUpstreamLeavesUncertainClaimAndIsNotRetried() throws Exception {
  exercise("not json","UNKNOWN",1);
 }
 @Test void wrongAppOwnerNeverReceivesWithdrawal() throws Exception {
  exercise("{\"code\":1}","REJECTED",99);
 }
 void exercise(String upstream,String expected,long profileOwner) throws Exception {
  var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);var writes=new AtomicInteger();var sent=new AtomicReference<String>();
  server.createContext("/api/user/userInfo",x->{byte[] b=("{\"code\":1,\"data\":{\"id\":"+profileOwner+"}}").getBytes(StandardCharsets.UTF_8);x.sendResponseHeaders(200,b.length);x.getResponseBody().write(b);x.close();});
  server.createContext("/api/user/userWithdrawal",x->{writes.incrementAndGet();sent.set(URLDecoder.decode(new String(x.getRequestBody().readAllBytes(),StandardCharsets.UTF_8),StandardCharsets.UTF_8));byte[] b=upstream.getBytes(StandardCharsets.UTF_8);x.sendResponseHeaders(200,b.length);x.getResponseBody().write(b);x.close();});server.start();
  try{
   var accounts=mock(CreatorAccountService.class);var jdbc=mock(JdbcTemplate.class);var tm=mock(PlatformTransactionManager.class);when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
   var owner=new CreatorAccountService.Account("owner","writer","Writer",1L,"app",null);
   when(accounts.require("session")).thenReturn(owner);when(accounts.appSession("session")).thenReturn(new CreatorAccountService.AppSession(1,"app-token"));when(accounts.login("writer","password123")).thenReturn(new CreatorAccountService.Login("temp",60,owner));
   var cipher=new PiiCipher(new CmsProperties(null,null,null,null,null,Base64.getEncoder().encodeToString(new byte[32]),null,null,null,null));
   when(jdbc.queryForList(contains("payload_encrypted"),eq(String.class),eq("owner"))).thenReturn(List.of(cipher.encrypt("{\"holderName\":\"Tester\",\"bankName\":\"Test Bank\",\"branch\":\"Branch\",\"accountNumber\":\"123456789012\"}")));
   var state=new AtomicReference<String>();
   when(jdbc.queryForList(startsWith("SELECT points,state"),eq(1L),anyString())).thenAnswer(c->state.get()==null?List.of():List.of(Map.of("points",10L,"state",state.get(),"account_id","owner")));
   when(jdbc.queryForObject(startsWith("SELECT COUNT"),eq(Integer.class),eq(1L))).thenReturn(0);
   when(jdbc.update(startsWith("INSERT INTO cms_creator_withdrawal_request"),eq(1L),anyString(),eq("owner"),eq(10L))).thenAnswer(c->{state.set("SENDING");return 1;});
   when(jdbc.update(startsWith("UPDATE cms_creator_withdrawal_request"),anyString(),eq(1L),anyString())).thenAnswer(c->{state.set(c.getArgument(1));return 1;});
   var controller=new CreatorWithdrawalController(accounts,jdbc,cipher,new ObjectMapper(),tm,"http://127.0.0.1:"+server.getAddress().getPort());
   var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer session");
   var input=new CreatorWithdrawalController.Input(UUID.randomUUID().toString(),10,"password123","•••• 9012",true);
   String result=controller.submit(input,request).toString();assertThat(result).contains(expected).doesNotContain("123456789012","password123","app-token");
   controller.submit(input,request);assertThat(writes.get()).isEqualTo(profileOwner==1?1:0);
   if(profileOwner==1)assertThat(sent.get()).contains("amount=10","bank_data[name]=Tester","bank_data[card]=123456789012","withdrawal_type=1").doesNotContain("user_id","password");
   assertThatThrownBy(()->controller.submit(new CreatorWithdrawalController.Input(input.requestId(),11,"password123","•••• 9012",true),request)).isInstanceOf(ApiException.class);
  }finally{server.stop(0);}
 }
}
