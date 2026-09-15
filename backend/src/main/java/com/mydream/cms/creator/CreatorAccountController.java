package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/creator-api/v1/auth")
public class CreatorAccountController {
    @org.springframework.beans.factory.annotation.Value("${CMS_APP_REVIEW_KEY:}") private String serverKey="";
    private final CreatorAccountService accounts;
    private final ConcurrentHashMap<String,Window> attempts=new ConcurrentHashMap<>();
    private record Window(long start,int count) {}
    public CreatorAccountController(CreatorAccountService accounts) { this.accounts=accounts; }
    public record Credentials(@NotBlank @Size(max=32) String account,@NotBlank @Size(max=72) String password,@Size(max=80) String displayName,boolean accepted) {}
    public record Binding(@NotBlank @Size(max=4096) String token,long expiresIn) {}
    public record Unbind(@NotBlank @Size(max=72) String password) {}
    private void limit(HttpServletRequest r) {
        long now=System.currentTimeMillis();
        if(attempts.size()>5000) attempts.entrySet().removeIf(e -> now-e.getValue().start()>600000);
        var window=attempts.compute(r.getRemoteAddr(),(key,old) -> old==null || now-old.start()>600000 ? new Window(now,1) : new Window(old.start(),old.count()+1));
        if(window.count()>100) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"RATE_LIMITED","嘗試次數過多，請稍後重試");
    }
    static String token(HttpServletRequest r) { var h=r.getHeader("Authorization"); return h!=null && h.startsWith("Bearer ") ? h.substring(7) : null; }
    @PostMapping("/register") Object register(@Valid @RequestBody Credentials c,HttpServletRequest r) { limit(r); return accounts.register(c.account(),c.password(),c.displayName(),c.accepted()); }
    @PostMapping("/login") Object login(@Valid @RequestBody Credentials c,HttpServletRequest r) { limit(r); return accounts.login(c.account(),c.password()); }
    @GetMapping("/me") Object me(HttpServletRequest r) { return accounts.require(token(r)); }
    @PostMapping("/logout") Object logout(HttpServletRequest r) { accounts.logout(token(r)); return Map.of("ok",true); }
    @PostMapping("/binding") Object bind(@Valid @RequestBody Binding b,HttpServletRequest r) { limit(r); return accounts.bind(token(r),b.token(),b.expiresIn()); }
    @PostMapping("/unbind") Object unbind(@Valid @RequestBody Unbind b,HttpServletRequest r) { limit(r); return accounts.unbind(token(r),b.password()); }
    @GetMapping("/app-session") Object appSession(@RequestParam(defaultValue="") String purpose,HttpServletRequest r) { String supplied=r.getHeader("X-Creator-Server-Key");if(serverKey.length()<32||supplied==null||!java.security.MessageDigest.isEqual(serverKey.getBytes(java.nio.charset.StandardCharsets.UTF_8),supplied.getBytes(java.nio.charset.StandardCharsets.UTF_8)))throw new ApiException(HttpStatus.FORBIDDEN,"SERVER_ONLY","此接口僅限平台伺服器調用");return accounts.appSession(token(r),purpose); }
}
