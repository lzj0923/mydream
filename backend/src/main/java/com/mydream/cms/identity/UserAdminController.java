package com.mydream.cms.identity;

import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin-api/v1/users")
@PreAuthorize("hasAuthority('user.manage')")
public class UserAdminController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    public UserAdminController(JdbcTemplate jdbc, PasswordEncoder encoder) {
        this.jdbc = jdbc;
        this.encoder = encoder;
    }

    @GetMapping
    public List<UserView> list() {
        return jdbc.query("""
                SELECT u.public_id,u.email,u.display_name,u.status,u.last_login_at,u.created_at,
                       GROUP_CONCAT(DISTINCT r.role_key ORDER BY r.role_key) roles
                FROM cms_admin_user u
                LEFT JOIN cms_user_role ur ON ur.user_id=u.id LEFT JOIN cms_role r ON r.id=ur.role_id
                GROUP BY u.id ORDER BY u.created_at DESC
                """, (rs, row) -> new UserView(rs.getString("public_id"), rs.getString("email"),
                rs.getString("display_name"), rs.getString("status"),
                rs.getTimestamp("last_login_at") == null ? null : rs.getTimestamp("last_login_at").toInstant(),
                rs.getTimestamp("created_at").toInstant(),
                rs.getString("roles") == null ? List.of() : List.of(rs.getString("roles").split(","))));
    }

    @PostMapping
    @Transactional
    public UserView create(@Valid @RequestBody CreateUserRequest request) {
        var email = request.email().trim().toLowerCase(Locale.ROOT);
        var userId = Ids.next();
        jdbc.update("""
                INSERT INTO cms_admin_user(public_id,email,password_hash,display_name,status) VALUES (?,?,?,?,'ACTIVE')
                """, userId, email, encoder.encode(request.password()), request.displayName());
        var dbId = jdbc.queryForObject("SELECT id FROM cms_admin_user WHERE public_id=?", Long.class, userId);
        var assigned = jdbc.update("""
                INSERT INTO cms_user_role(user_id,role_id,site_id)
                SELECT ?,r.id,s.id FROM cms_role r JOIN cms_site s ON s.public_id=? WHERE r.role_key=?
                """, dbId, request.siteId(), request.role().toUpperCase(Locale.ROOT));
        if (assigned != 1) throw ApiException.invalid("站点或角色不存在");
        return list().stream().filter(user -> user.id().equals(userId)).findFirst().orElseThrow();
    }

    @PatchMapping("/status")
    public UserView status(@Valid @RequestBody UserStatusRequest request) {
        var status = request.status().toUpperCase(Locale.ROOT);
        if (jdbc.update("UPDATE cms_admin_user SET status=?,lock_version=lock_version+1 WHERE public_id=?",
                status, request.userId()) != 1) throw ApiException.notFound("管理员不存在");
        return list().stream().filter(user -> user.id().equals(request.userId())).findFirst().orElseThrow();
    }

    public record CreateUserRequest(@Email @NotBlank String email,
                                    @NotBlank @Size(min = 12, max = 200) String password,
                                    @NotBlank @Size(max = 120) String displayName,
                                    @NotBlank String siteId,
                                    @NotBlank String role) {}
    public record UserStatusRequest(@NotBlank String userId,
                                    @NotBlank @Pattern(regexp = "ACTIVE|DISABLED") String status) {}
    public record UserView(String id, String email, String displayName, String status, Instant lastLoginAt,
                           Instant createdAt, List<String> roles) {}
}
