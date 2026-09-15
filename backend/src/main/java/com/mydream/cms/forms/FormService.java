package com.mydream.cms.forms;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class FormService {
    private static final int MAX_PAYLOAD_BYTES = 64 * 1024;
    private static final Set<String> STATUSES = Set.of("NEW", "IN_PROGRESS", "DONE", "SPAM");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final PiiCipher cipher;
    private final FormNotificationService notifications;

    public FormService(JdbcTemplate jdbc, ObjectMapper mapper, PiiCipher cipher,
                       FormNotificationService notifications) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.cipher = cipher;
        this.notifications = notifications;
    }

    @Transactional
    public SubmissionReceipt submit(String siteKey, String formKey, SubmissionRequest request) {
        var forms = jdbc.query("""
                SELECT s.id site_id,f.schema_json FROM cms_site s JOIN cms_form_definition f ON f.site_id=s.id
                WHERE s.site_key=? AND f.form_key=? AND f.enabled=TRUE
                """, (rs, row) -> new FormRow(rs.getLong("site_id"), json(rs.getString("schema_json"))), siteKey, formKey);
        if (forms.isEmpty()) throw ApiException.notFound("表单不存在或已停用");
        if (!request.consent()) throw ApiException.invalid("提交前必须同意隐私条款");
        if (request.sourcePath() == null || !request.sourcePath().startsWith("/")) throw ApiException.invalid("来源路径不正确");
        var payload = request.payload();
        if (payload == null || !payload.isObject()) throw ApiException.invalid("表单数据必须是 JSON 对象");
        validateRequired(forms.get(0).schema(), payload, request.consent());
        var serialized = jsonString(payload);
        if (serialized.getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) throw ApiException.invalid("表单数据过大");
        var publicId = Ids.next();
        var plan = notifications.plan(forms.get(0).siteId(), formKey);
        jdbc.update("""
                INSERT INTO cms_form_submission(public_id,site_id,form_key,payload_encrypted,status,email_status,email_recipient,source_path,consented_at)
                VALUES (?,?,?,?,'NEW',?,?,?,CURRENT_TIMESTAMP(6))
                """, publicId, forms.get(0).siteId(), formKey, cipher.encrypt(serialized), plan.status(),
                plan.recipient().isBlank() ? null : plan.recipient(), request.sourcePath());
        if (plan.deliver()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { notifications.deliver(publicId); }
            });
        }
        return new SubmissionReceipt(publicId, "NEW", plan.status(), Instant.now());
    }

    public List<SubmissionView> list(String sitePublicId, String formKey, String status) {
        return jdbc.query("""
                SELECT x.public_id,x.form_key,x.payload_encrypted,x.status,x.email_status,x.email_recipient,
                       x.email_sent_at,x.email_error,x.source_path,x.consented_at,x.created_at
                FROM cms_form_submission x JOIN cms_site s ON s.id=x.site_id
                WHERE s.public_id=? AND (? IS NULL OR x.form_key=?) AND (? IS NULL OR x.status=?)
                ORDER BY x.created_at DESC LIMIT 500
                """, (rs, row) -> new SubmissionView(rs.getString("public_id"), rs.getString("form_key"),
                json(cipher.decrypt(rs.getString("payload_encrypted"))), rs.getString("status"), rs.getString("email_status"),
                rs.getString("email_recipient"), instant(rs.getTimestamp("email_sent_at")), rs.getString("email_error"),
                rs.getString("source_path"), rs.getTimestamp("consented_at").toInstant(),
                rs.getTimestamp("created_at").toInstant()), sitePublicId, formKey, formKey, status, status);
    }

    @Transactional
    public SubmissionView updateStatus(String submissionId, StatusRequest request) {
        var status = request.status() == null ? "" : request.status().toUpperCase(java.util.Locale.ROOT);
        if (!STATUSES.contains(status)) throw ApiException.invalid("不支持的表单状态");
        if (jdbc.update("UPDATE cms_form_submission SET status=? WHERE public_id=?", status, submissionId) != 1) {
            throw ApiException.notFound("表单提交不存在");
        }
        var rows = jdbc.query("""
                SELECT public_id,form_key,payload_encrypted,status,email_status,email_recipient,email_sent_at,email_error,
                       source_path,consented_at,created_at
                FROM cms_form_submission WHERE public_id=?
                """, (rs, row) -> new SubmissionView(rs.getString("public_id"), rs.getString("form_key"),
                json(cipher.decrypt(rs.getString("payload_encrypted"))), rs.getString("status"), rs.getString("email_status"),
                rs.getString("email_recipient"), instant(rs.getTimestamp("email_sent_at")), rs.getString("email_error"),
                rs.getString("source_path"), rs.getTimestamp("consented_at").toInstant(),
                rs.getTimestamp("created_at").toInstant()), submissionId);
        return rows.get(0);
    }

    private void validateRequired(JsonNode schema, JsonNode payload, boolean consent) {
        var required = schema.path("required");
        if (!required.isArray()) return;
        for (var field : required) {
            var key = field.asText();
            if ("consent".equals(key)) {
                if (!consent) throw ApiException.invalid("缺少必填字段: consent");
                continue;
            }
            var value = payload.get(key);
            if (value == null || value.isNull() || (value.isTextual() && value.asText().isBlank())
                    || (value.isArray() && value.isEmpty())) {
                throw ApiException.invalid("缺少必填字段: " + key);
            }
        }
    }

    private JsonNode json(String value) {
        try { return mapper.readTree(value); }
        catch (JacksonException exception) { throw new IllegalStateException("JSON 无法解析", exception); }
    }

    private String jsonString(JsonNode value) {
        try { return mapper.writeValueAsString(value); }
        catch (JacksonException exception) { throw ApiException.invalid("表单 JSON 无法序列化"); }
    }

    public record SubmissionRequest(JsonNode payload, String sourcePath, boolean consent) {}
    public record StatusRequest(String status) {}
    private Instant instant(java.sql.Timestamp value) { return value == null ? null : value.toInstant(); }

    public record SubmissionReceipt(String id, String status, String emailStatus, Instant receivedAt) {}
    public record SubmissionView(String id, String formKey, JsonNode payload, String status, String emailStatus,
                                 String emailRecipient, Instant emailSentAt, String emailError, String sourcePath,
                                 Instant consentedAt, Instant createdAt) {}
    private record FormRow(long siteId, JsonNode schema) {}
}
