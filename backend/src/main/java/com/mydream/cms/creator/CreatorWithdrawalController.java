package com.mydream.cms.creator;

import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;

/** App owns deduction, conversion and payout. Persist a claim before sending; never replay an uncertain write. */
@RestController
@RequestMapping("/creator-api/v1/withdrawals")
public class CreatorWithdrawalController {
 private final CreatorAccountService accounts; private final JdbcTemplate jdbc; private final PiiCipher cipher;
 private final ObjectMapper mapper; private final TransactionTemplate tx; private final String appBase;
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
 private final java.util.concurrent.ConcurrentHashMap<String,Window> attempts=new java.util.concurrent.ConcurrentHashMap<>();
 private record Window(long started,int count){}
 public CreatorWithdrawalController(CreatorAccountService accounts,JdbcTemplate jdbc,PiiCipher cipher,ObjectMapper mapper,
   PlatformTransactionManager transactions,@Value("${APP_AUTH_API_URL:https://share.the-drama-has-a-plot.com}") String appBase){
  this.accounts=accounts;this.jdbc=jdbc;this.cipher=cipher;this.mapper=mapper;this.tx=new TransactionTemplate(transactions);this.appBase=appBase.replaceAll("/+$","");
 }
 public record Input(@NotBlank @Pattern(regexp="[a-fA-F0-9-]{36}") String requestId,@Min(1) @Max(2147483647) long points,
   @NotBlank @Size(max=72) String password,@NotBlank @Size(max=30) String bankLastFour,boolean confirmed){}
 private Map<String,Object> result(String state){return Map.of("state",state,"message",switch(state){
  case "ACCEPTED"->"提現申請已提交 App，請在提現記錄查看審核進度。";
  case "REJECTED"->"App 未接受本次申請，請核對積分餘額及最低兌換金額後重新申請。";
  default->"提交結果待核對，請先查看 App 提現記錄並聯絡客服確認；請勿重複申請。";
 });}
 @GetMapping Object status(HttpServletRequest request){
  var session=accounts.appSession(CreatorAccountController.token(request));
  var rows=jdbc.queryForList("SELECT state,request_id,points FROM cms_creator_withdrawal_request WHERE app_user_id=? AND state IN ('SENDING','UNKNOWN') LIMIT 1",session.userId());
  if(rows.isEmpty())return Map.of("state","READY");
  var claim=rows.get(0);
  // Existing App API cannot prove request identity; retain the local block for manual verification.
  return result(claim.get("state").toString());
 }
 @PostMapping Object submit(@Valid @RequestBody Input input,HttpServletRequest request){
  if(!input.confirmed())throw ApiException.invalid("請確認提現資料及積分扣除");
  String token=CreatorAccountController.token(request);var owner=accounts.require(token);var session=accounts.appSession(token);
  long now=System.currentTimeMillis();if(attempts.size()>5000)attempts.entrySet().removeIf(e->now-e.getValue().started()>600000);
  var window=attempts.compute(owner.id(),(k,v)->v==null||now-v.started()>600000?new Window(now,1):new Window(v.started(),v.count()+1));
  if(window.count()>10)throw new ApiException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,"RATE_LIMITED","嘗試次數過多，請稍後重試");
  var checked=accounts.login(owner.username(),input.password());accounts.logout(checked.token());
  var banks=jdbc.queryForList("SELECT payload_encrypted FROM cms_creator_bank_account WHERE account_id=?",String.class,owner.id());
  if(banks.isEmpty())throw ApiException.invalid("請先綁定收款銀行卡");
  var bank=mapper.readTree(cipher.decrypt(banks.get(0)));
  String number=CreatorBankAccountController.number(bank.path("accountNumber").asText());
  if(!CreatorBankAccountController.masked(number).equals(input.bankLastFour()))throw ApiException.conflict("銀行卡已變更，請重新打開提現窗口確認");
  String existing=tx.execute(status->{
   jdbc.update("INSERT IGNORE INTO cms_creator_withdrawal_gate(app_user_id) VALUES (?)",session.userId());
   jdbc.queryForObject("SELECT app_user_id FROM cms_creator_withdrawal_gate WHERE app_user_id=? FOR UPDATE",Long.class,session.userId());
   var previous=jdbc.queryForList("SELECT points,state,account_id FROM cms_creator_withdrawal_request WHERE app_user_id=? AND request_id=?",session.userId(),input.requestId());
   if(!previous.isEmpty()){
    var row=previous.get(0);if(((Number)row.get("points")).longValue()!=input.points()||!owner.id().equals(row.get("account_id")))throw ApiException.conflict("請勿變更同一筆提現申請");
    return row.get("state").toString();
   }
   if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_withdrawal_request WHERE app_user_id=? AND state IN ('SENDING','UNKNOWN')",Integer.class,session.userId())>0)throw ApiException.conflict("上一筆提現結果待核對，暫不可再次提交");
   jdbc.update("INSERT INTO cms_creator_withdrawal_request(app_user_id,request_id,account_id,points,state) VALUES (?,?,?,?,'SENDING')",session.userId(),input.requestId(),owner.id(),input.points());
   return null;
  });
  if(existing!=null)return result(existing);
  String state="UNKNOWN";boolean dispatched=false;
  try{
   // Verify the stored App token still resolves to its bound owner before the mutation.
   var profile=client.send(HttpRequest.newBuilder(URI.create(appBase+"/api/user/userInfo")).timeout(Duration.ofSeconds(12)).header("token",session.token()).GET().build(),HttpResponse.BodyHandlers.ofString());
   var envelope=mapper.readTree(profile.body());var user=envelope.path("data");if(user.has("userinfo"))user=user.path("userinfo");
   if(profile.statusCode()!=200||envelope.path("code").asInt()!=1||user.path("id").asLong()!=session.userId()){
    state="REJECTED";
   }else{
    var fields=new LinkedHashMap<String,String>();fields.put("withdrawal_type","1");fields.put("withdrawal_method","2");fields.put("amount",Long.toString(input.points()));
    fields.put("bank_name",bank.path("bankName").asText());fields.put("bank_data[name]",bank.path("holderName").asText());fields.put("bank_data[bank]",bank.path("bankName").asText()+(bank.path("branch").asText().isBlank()?"":" · "+bank.path("branch").asText()));fields.put("bank_data[card]",number);
    dispatched=true;
    var response=client.send(HttpRequest.newBuilder(URI.create(appBase+"/api/user/userWithdrawal")).timeout(Duration.ofSeconds(20)).header("token",session.token()).header("Content-Type","application/x-www-form-urlencoded;charset=UTF-8").POST(HttpRequest.BodyPublishers.ofString(form(fields))).build(),HttpResponse.BodyHandlers.ofString());
    var body=mapper.readTree(response.body());
    if(response.statusCode()==200&&body.has("code"))state=body.path("code").asInt()==1?"ACCEPTED":body.path("code").asInt()==0?"REJECTED":"UNKNOWN";
   }
  }catch(Exception e){if(!dispatched)state="REJECTED";if(e instanceof InterruptedException)Thread.currentThread().interrupt();}
  jdbc.update("UPDATE cms_creator_withdrawal_request SET state=? WHERE app_user_id=? AND request_id=? AND state='SENDING'",state,session.userId(),input.requestId());
  return result(state);
 }
 static String form(Map<String,String> fields){return fields.entrySet().stream().map(e->URLEncoder.encode(e.getKey(),StandardCharsets.UTF_8)+"="+URLEncoder.encode(e.getValue(),StandardCharsets.UTF_8)).collect(java.util.stream.Collectors.joining("&"));}
}
