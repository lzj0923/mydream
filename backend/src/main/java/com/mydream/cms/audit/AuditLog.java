package com.mydream.cms.audit;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuditLog {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AuditLog(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public void record(long siteId, Long actorId, String action, String resourceType, String resourceId, JsonNode after) {
        jdbc.update("""
                INSERT INTO cms_audit_log(site_id,actor_id,action,resource_type,resource_id,after_json)
                VALUES (?,?,?,?,?,CAST(? AS JSON))
                """, siteId, actorId, action, resourceType, resourceId, json(after));
    }

    private String json(JsonNode value) {
        if (value == null) return null;
        try { return mapper.writeValueAsString(value); }
        catch (JacksonException exception) { throw new IllegalArgumentException("无法序列化审计数据", exception); }
    }
}
