package com.mydream.cms.identity;

import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

@Component
public class AdminUserDetailsService implements UserDetailsService {
    private final JdbcTemplate jdbc;

    public AdminUserDetailsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var users = jdbc.query("""
                SELECT id, email, password_hash, status
                FROM cms_admin_user
                WHERE email = ?
                """, (rs, rowNum) -> new UserRow(
                rs.getLong("id"), rs.getString("email"), rs.getString("password_hash"), rs.getString("status")
        ), username.trim().toLowerCase());
        if (users.isEmpty()) throw new UsernameNotFoundException("账号不存在");
        var row = users.get(0);
        var authorities = new ArrayList<SimpleGrantedAuthority>();
        jdbc.query("""
                SELECT DISTINCT r.role_key, p.permission_key
                FROM cms_user_role ur
                JOIN cms_role r ON r.id = ur.role_id
                LEFT JOIN cms_role_permission rp ON rp.role_id = r.id
                LEFT JOIN cms_permission p ON p.id = rp.permission_id
                WHERE ur.user_id = ?
                """, rs -> {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + rs.getString("role_key")));
            var permission = rs.getString("permission_key");
            if (permission != null) authorities.add(new SimpleGrantedAuthority(permission));
        }, row.id());
        return User.withUsername(row.email())
                .password(row.passwordHash())
                .authorities(authorities.stream().distinct().toList())
                .disabled(!"ACTIVE".equals(row.status()))
                .build();
    }

    private record UserRow(long id, String email, String passwordHash, String status) {}
}
