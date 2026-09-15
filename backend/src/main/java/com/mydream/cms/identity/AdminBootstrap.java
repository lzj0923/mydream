package com.mydream.cms.identity;

import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.shared.Ids;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final CmsProperties properties;

    public AdminBootstrap(JdbcTemplate jdbc, PasswordEncoder encoder, CmsProperties properties) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(properties.bootstrapAdminEmail()) || !StringUtils.hasText(properties.bootstrapAdminPassword())) return;
        var email = properties.bootstrapAdminEmail().trim().toLowerCase();
        var count = jdbc.queryForObject("SELECT COUNT(*) FROM cms_admin_user WHERE email=?", Integer.class, email);
        if (count != null && count > 0) return;
        jdbc.update("""
                INSERT INTO cms_admin_user(public_id,email,password_hash,display_name,status)
                VALUES (?,?,?,?, 'ACTIVE')
                """, Ids.next(), email, encoder.encode(properties.bootstrapAdminPassword()), "Bootstrap Admin");
        var userId = jdbc.queryForObject("SELECT id FROM cms_admin_user WHERE email=?", Long.class, email);
        jdbc.update("""
                INSERT INTO cms_user_role(user_id,role_id,site_id)
                SELECT ?,r.id,s.id FROM cms_role r CROSS JOIN cms_site s
                WHERE r.role_key='SUPER_ADMIN' AND s.site_key='mydream'
                """, userId);
    }
}
