package com.mydream.cms.creator;

import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** Creator credentials belong to the CMS database, never the App user table. */
@Service
public class CreatorAccountService {
    private static final long SESSION_SECONDS = 7 * 86400;
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private CreatorTeamService teams;
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private CreatorWorkTypeService workTypes;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final PiiCipher cipher;
    private final ObjectMapper mapper;
    private final String appBase;
    private final String dummyHash;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final SecureRandom random = new SecureRandom();

    public CreatorAccountService(JdbcTemplate jdbc, PasswordEncoder passwords, PiiCipher cipher,
            ObjectMapper mapper, @Value("${APP_AUTH_API_URL:https://share.the-drama-has-a-plot.com}") String appBase) {
        this.jdbc=jdbc; this.passwords=passwords; this.cipher=cipher; this.mapper=mapper;
        this.appBase=appBase.replaceAll("/+$", ""); this.dummyHash=passwords.encode(UUID.randomUUID().toString());
    }
    public record Account(String id, String username, String displayName, Long appUserId, String appUsername, Instant appExpiresAt) {}
    public record Login(String token, long expiresIn, Account account) {}
    public record AppSession(long userId, String token) {}
    public static String username(String input) {
        String value=input == null ? "" : input.trim().toLowerCase(Locale.ROOT);
        if (!value.matches("[a-z0-9][a-z0-9_]{3,31}")) throw ApiException.invalid("賬號需為 4–32 位英文字母、數字或底線");
        return value;
    }
    public static void validatePassword(String value) {
        if (value == null || value.length()<8 || value.length()>64 || value.getBytes(StandardCharsets.UTF_8).length>72
                || !value.matches("(?s).*[A-Za-z].*") || !value.matches("(?s).*[0-9].*"))
            throw ApiException.invalid("密碼需為 8–64 位，包含英文字母和數字，且不超過 72 位元組");
    }
    private Account account(String id) {
        var rows=jdbc.query("SELECT id,username,display_name,app_user_id,app_username,app_token_expires_at FROM cms_creator_account WHERE id=?",
            (rs,n) -> new Account(rs.getString(1),rs.getString(2),rs.getString(3),rs.getObject(4)==null?null:rs.getLong(4),rs.getString(5),rs.getTimestamp(6)==null?null:rs.getTimestamp(6).toInstant()),id);
        if(rows.isEmpty()) throw unauthorized();
        return rows.get(0);
    }
    @Transactional
    public Login register(String user, String password, String displayName, boolean accepted) {
        String normalized=username(user); validatePassword(password);
        if(!accepted) throw ApiException.invalid("請閱讀並同意用戶協議和隱私政策");
        String name=displayName==null || displayName.isBlank() ? normalized : displayName.trim();
        if(name.length()>80) throw ApiException.invalid("暱稱最多 80 字");
        String id=UUID.randomUUID().toString();
        try { jdbc.update("INSERT INTO cms_creator_account(id,username,password_hash,display_name) VALUES (?,?,?,?)",id,normalized,passwords.encode(password),name); }
        catch(DuplicateKeyException e) { throw ApiException.conflict("此賬號已被使用，請更換賬號或登錄"); }
        return issue(account(id));
    }
    public Login login(String user, String password) {
        String normalized=username(user);
        if(password==null || password.getBytes(StandardCharsets.UTF_8).length>72) throw unauthorizedPassword();
        var rows=jdbc.queryForList("SELECT id,password_hash,locked_until FROM cms_creator_account WHERE username=?",normalized);
        if(rows.isEmpty()) { passwords.matches(password,dummyHash); throw unauthorizedPassword(); }
        var row=rows.get(0); String id=row.get("id").toString();
        var locked=jdbc.queryForObject("SELECT COALESCE(locked_until>CURRENT_TIMESTAMP,FALSE) FROM cms_creator_account WHERE id=?",Boolean.class,id);
        if(Boolean.TRUE.equals(locked)) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"LOGIN_RATE_LIMITED","嘗試次數過多，請 15 分鐘後重試");
        if(!passwords.matches(password,row.get("password_hash").toString())) {
            jdbc.update("UPDATE cms_creator_account SET failed_attempts=IF(locked_until IS NOT NULL AND locked_until<=CURRENT_TIMESTAMP,1,failed_attempts+1),locked_until=IF(failed_attempts>=8,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 15 MINUTE),NULL) WHERE id=?",id);
            throw unauthorizedPassword();
        }
        jdbc.update("UPDATE cms_creator_account SET failed_attempts=0,locked_until=NULL WHERE id=?",id);
        return issue(account(id));
    }
    private Login issue(Account account) {
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        String token="cr_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update("DELETE FROM cms_creator_session WHERE expires_at<CURRENT_TIMESTAMP");
        jdbc.update("INSERT INTO cms_creator_session(token_hash,account_id,expires_at) VALUES (?,?,?)",hash(token),account.id(),Timestamp.from(Instant.now().plusSeconds(SESSION_SECONDS)));
        return new Login(token,SESSION_SECONDS,account);
    }
    public Account require(String token) {
        if(token==null || !token.matches("cr_[A-Za-z0-9_-]{43}")) throw unauthorized();
        var ids=jdbc.queryForList("SELECT account_id FROM cms_creator_session WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP",String.class,hash(token));
        if(ids.isEmpty()) throw unauthorized();
        return account(ids.get(0));
    }
    public void logout(String token) { if(token!=null) jdbc.update("DELETE FROM cms_creator_session WHERE token_hash=?",hash(token)); }
    public CreatorAccess.Viewer viewer(String token) { var a=require(token); return new CreatorAccess.Viewer("creator:"+(teams==null?a.id():teams.scope(a.id()).owner()),a.displayName(),false,workTypes==null?null:workTypes.current(a.id())); }
    @Transactional
    public Account bind(String creatorToken, String appToken, long expiresIn) {
        var a=require(creatorToken);
        if(appToken==null || appToken.isBlank() || appToken.length()>4096) throw ApiException.invalid("App 登錄授權無效");
        long appId; String name;
        try {
            var response=client.send(HttpRequest.newBuilder(URI.create(appBase+"/api/user/userInfo")).timeout(Duration.ofSeconds(12)).header("token",appToken).header("Accept","application/json").GET().build(),HttpResponse.BodyHandlers.ofString());
            var root=mapper.readTree(response.body()); var data=root.path("data"); var user=data.has("userinfo")?data.path("userinfo"):data;
            if(response.statusCode()!=200 || root.path("code").asInt()!=1 || user.path("id").asLong()<1) throw ApiException.invalid("App 登錄已失效，請重新驗證");
            appId=user.path("id").asLong(); name=user.path("username").asText("App 用戶");
        } catch(ApiException e) { throw e; }
        catch(InterruptedException e) { Thread.currentThread().interrupt(); throw ApiException.unavailable("App 驗證已中斷"); }
        catch(Exception e) { throw ApiException.unavailable("App 驗證服務暫時不可用"); }
        var existing=jdbc.queryForObject("SELECT app_user_id FROM cms_creator_account WHERE id=? FOR UPDATE",Long.class,a.id());
        if(existing!=null && existing!=appId) throw ApiException.conflict("已綁定其他 App 賬號，請先解除綁定");
        try { jdbc.update("UPDATE cms_creator_account SET app_user_id=?,app_username=?,app_token_encrypted=?,app_token_expires_at=?,bound_at=COALESCE(bound_at,CURRENT_TIMESTAMP) WHERE id=?",appId,name.substring(0,Math.min(120,name.length())),cipher.encrypt(appToken),Timestamp.from(Instant.now().plusSeconds(Math.min(Math.max(expiresIn,60),2592000))),a.id()); }
        catch(DuplicateKeyException e) { throw ApiException.conflict("此 App 賬號已綁定其他創作者賬號"); }
        return account(a.id());
    }
    public Account unbind(String token,String password) {
        var a=require(token);
        // Reuse password verification and its persistent failure limit before removing a binding.
        var checked=login(a.username(),password); logout(checked.token());
        jdbc.update("UPDATE cms_creator_account SET app_user_id=NULL,app_username=NULL,app_token_encrypted=NULL,app_token_expires_at=NULL,bound_at=NULL WHERE id=?",a.id());
        return account(a.id());
    }
    public AppSession appSession(String token) { return appSession(token, ""); }
    public AppSession appSession(String token,String purpose) {
        var actor=require(token);
        var a=teams==null?actor:account(teams.appOwner(actor.id(),purpose));
        if(a.appUserId()==null) throw new ApiException(HttpStatus.CONFLICT,"APP_BINDING_REQUIRED","請先在賬號信息中綁定 App 賬號");
        if(a.appExpiresAt()==null || a.appExpiresAt().isBefore(Instant.now())) throw new ApiException(HttpStatus.CONFLICT,"APP_REAUTH_REQUIRED","App 賬號仍已綁定，登錄狀態已過期，請在賬號信息中更新登錄狀態");
        String encrypted=jdbc.queryForObject("SELECT app_token_encrypted FROM cms_creator_account WHERE id=? AND app_user_id=?",String.class,a.id(),a.appUserId());
        if(encrypted==null) throw new ApiException(HttpStatus.CONFLICT,"APP_REAUTH_REQUIRED","App 賬號仍已綁定，請在賬號信息中更新登錄狀態");
        return new AppSession(a.appUserId(),cipher.decrypt(encrypted));
    }
    public String appOwner(String owner) {
        if(!owner.startsWith("creator:")) return owner;
        var a=account(owner.substring(8));
        if(a.appUserId()==null) throw ApiException.conflict("請先綁定 App 賬號");
        return "app:"+a.appUserId();
    }
    static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static ApiException unauthorized() { return new ApiException(HttpStatus.UNAUTHORIZED,"CREATOR_LOGIN_REQUIRED","請先登錄創作者賬號"); }
    private static ApiException unauthorizedPassword() { return new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","賬號或密碼不正確"); }
}
