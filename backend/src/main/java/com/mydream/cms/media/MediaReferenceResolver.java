package com.mydream.cms.media;

import com.mydream.cms.config.CmsProperties;
import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@Component
public class MediaReferenceResolver {
    private final JdbcTemplate jdbc;
    private final CmsProperties properties;

    public MediaReferenceResolver(JdbcTemplate jdbc, CmsProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    public JsonNode resolve(JsonNode value) {
        if (value == null) return null;
        return resolveNode(value.deepCopy(), new HashMap<>());
    }

    private JsonNode resolveNode(JsonNode node, Map<String, String> urls) {
        if (node instanceof ArrayNode array) {
            for (var index = 0; index < array.size(); index++) array.set(index, resolveNode(array.get(index), urls));
            return array;
        }
        if (!(node instanceof ObjectNode object)) return node;
        var fields = object.properties().stream().map(Map.Entry::getKey).toList();
        for (var field : fields) object.set(field, resolveNode(object.get(field), urls));
        for (var field : fields) {
            if (!field.endsWith("MediaId") || !object.path(field).isTextual()) continue;
            var mediaId = object.path(field).asText().trim();
            if (mediaId.isEmpty()) continue;
            var url = urls.computeIfAbsent(mediaId, this::mediaUrl);
            if (url != null) object.put(field.substring(0, field.length() - "MediaId".length()) + "Url", url);
        }
        return object;
    }

    private String mediaUrl(String publicId) {
        var rows = jdbc.query("SELECT storage_key FROM cms_media_asset WHERE public_id=? AND status='READY'",
                (rs, row) -> rs.getString(1), publicId);
        if (rows.isEmpty()) return null;
        return properties.publicBaseUrl().replaceAll("/$", "") + "/media/" + rows.get(0);
    }
}
