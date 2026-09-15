package com.mydream.cms.forms;

import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.shared.ApiException;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class FormNotificationService {
    private static final Logger log = LoggerFactory.getLogger(FormNotificationService.class);
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final PiiCipher cipher;
    private final JavaMailSender mailSender;
    private final String mailHost;
    private final String mailFrom;

    public FormNotificationService(JdbcTemplate jdbc, ObjectMapper mapper, PiiCipher cipher,
                                   ObjectProvider<JavaMailSender> mailSender,
                                   @Value("${spring.mail.host:}") String mailHost,
                                   CmsProperties properties) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.cipher = cipher;
        this.mailSender = mailSender.getIfAvailable();
        this.mailHost = clean(mailHost);
        this.mailFrom = clean(properties.mailFrom());
    }

    public NotificationSettings settings(String sitePublicId, String formKey) {
        var rows = jdbc.query("""
                SELECT n.form_key,n.recipient_email,n.enabled,n.lock_version
                FROM cms_form_notification_setting n JOIN cms_site s ON s.id=n.site_id
                WHERE s.public_id=? AND n.form_key=?
                """, (rs, row) -> new NotificationSettings(rs.getString("form_key"),
                rs.getString("recipient_email"), rs.getBoolean("enabled"), smtpConfigured(),
                rs.getInt("lock_version")), sitePublicId, formKey);
        if (rows.isEmpty()) throw ApiException.notFound("表单邮件通知设置不存在");
        return rows.get(0);
    }

    @Transactional
    public NotificationSettings saveSettings(String sitePublicId, String formKey, SaveNotificationSettingsRequest request) {
        var email = clean(request.recipientEmail()).toLowerCase(Locale.ROOT);
        if (request.enabled() && email.isBlank()) throw ApiException.invalid("启用邮件通知前必须填写收件邮箱");
        if (!email.isBlank()) validateEmail(email);
        var changed = jdbc.update("""
                UPDATE cms_form_notification_setting n
                JOIN cms_site s ON s.id=n.site_id
                SET n.recipient_email=?,n.enabled=?,n.lock_version=n.lock_version+1
                WHERE s.public_id=? AND n.form_key=? AND n.lock_version=?
                """, email, request.enabled(), sitePublicId, formKey, request.lockVersion());
        if (changed != 1) throw ApiException.conflict("邮件通知设置已被其他管理员修改，请刷新后重试");
        return settings(sitePublicId, formKey);
    }

    NotificationPlan plan(long siteId, String formKey) {
        var rows = jdbc.query("""
                SELECT recipient_email,enabled FROM cms_form_notification_setting
                WHERE site_id=? AND form_key=?
                """, (rs, row) -> new NotificationPlan(rs.getBoolean("enabled") && smtpConfigured()
                && !rs.getString("recipient_email").isBlank(), rs.getString("recipient_email")), siteId, formKey);
        return rows.isEmpty() ? new NotificationPlan(false, "") : rows.get(0);
    }

    public void deliver(String submissionId) {
        var rows = jdbc.query("""
                SELECT x.email_recipient,x.payload_encrypted,x.source_path,x.created_at
                FROM cms_form_submission x
                WHERE x.public_id=? AND x.email_status='QUEUED'
                """, (rs, row) -> new DeliveryRow(rs.getString("email_recipient"),
                rs.getString("payload_encrypted"), rs.getString("source_path"),
                timestamp(rs.getTimestamp("created_at"))), submissionId);
        if (rows.isEmpty() || mailSender == null) return;
        var row = rows.get(0);
        try {
            var payload = json(cipher.decrypt(row.encryptedPayload()));
            mailSender.send(ContactMailMessageFactory.create(mailFrom, row.recipient(), submissionId,
                    row.sourcePath(), payload));
            jdbc.update("""
                    UPDATE cms_form_submission SET email_status='SENT',email_sent_at=CURRENT_TIMESTAMP(6),email_error=NULL
                    WHERE public_id=? AND email_status='QUEUED'
                    """, submissionId);
        } catch (RuntimeException exception) {
            var error = clean(exception.getClass().getSimpleName() + ": " + exception.getMessage());
            if (error.length() > 500) error = error.substring(0, 500);
            jdbc.update("""
                    UPDATE cms_form_submission SET email_status='FAILED',email_error=?
                    WHERE public_id=? AND email_status='QUEUED'
                    """, error, submissionId);
            log.warn("Contact form email delivery failed for submission {}: {}", submissionId,
                    exception.getClass().getSimpleName());
        }
    }

    private boolean smtpConfigured() {
        return mailSender != null && !mailHost.isBlank() && !mailFrom.isBlank();
    }

    private void validateEmail(String value) {
        try { new InternetAddress(value).validate(); }
        catch (AddressException exception) { throw ApiException.invalid("收件邮箱格式不正确"); }
    }

    private JsonNode json(String value) {
        try { return mapper.readTree(value); }
        catch (JacksonException exception) { throw new IllegalStateException("表单 JSON 无法解析", exception); }
    }

    private static Instant timestamp(Timestamp value) { return value == null ? null : value.toInstant(); }
    private static String clean(String value) { return value == null ? "" : value.strip(); }

    public record NotificationSettings(String formKey, String recipientEmail, boolean enabled,
                                       boolean smtpConfigured, int lockVersion) {}
    public record SaveNotificationSettingsRequest(String recipientEmail, boolean enabled, int lockVersion) {}
    record NotificationPlan(boolean deliver, String recipient) {
        String status() { return deliver ? "QUEUED" : "NOT_CONFIGURED"; }
    }
    private record DeliveryRow(String recipient, String encryptedPayload, String sourcePath, Instant createdAt) {}
}
