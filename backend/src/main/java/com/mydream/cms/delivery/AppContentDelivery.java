package com.mydream.cms.delivery;

import com.mydream.cms.config.AppContentProperties;
import com.mydream.cms.config.AppContentDatabase;
import com.mydream.cms.shared.ApiException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@ConditionalOnProperty(prefix = "cms.app-content", name = "enabled", havingValue = "true")
public class AppContentDelivery {
    private static final Map<String, String> CONTENT_VIEWS = Map.of(
            "work", "web_content_work",
            "episode", "web_content_episode",
            "original-video", "web_content_video"
    );

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final AppContentProperties properties;

    public AppContentDelivery(AppContentDatabase database,
                              ObjectMapper mapper,
                              AppContentProperties properties) {
        this.jdbc = database.jdbc();
        this.mapper = mapper;
        this.properties = properties;
    }

    public boolean supports(String type) {
        return CONTENT_VIEWS.containsKey(type);
    }

    public List<DeliveryModels.Content> content(String type, String locale, String parentSlug, int limit, int offset) {
        var view = requiredView(type);
        var sql = """
                SELECT content_id,content_type,slug,locale,title,summary,cover_url,data_json,featured,sort_weight
                FROM %s
                WHERE (? IS NULL OR locale=?) AND (? IS NULL OR parent_slug=?)
                ORDER BY featured DESC,sort_weight DESC,published_at DESC
                LIMIT ? OFFSET ?
                """.formatted(view);
        return jdbc.query(sql, this::contentRow, locale, locale, parentSlug, parentSlug,
                SiteDelivery.normalizeContentLimit(limit), Math.max(offset, 0));
    }

    public DeliveryModels.Content contentItem(String type, String slug, String locale) {
        var view = requiredView(type);
        var rows = jdbc.query("""
                SELECT content_id,content_type,slug,locale,title,summary,cover_url,data_json,featured,sort_weight
                FROM %s WHERE slug=? AND (? IS NULL OR locale=?)
                """.formatted(view), this::contentRow, slug, locale, locale);
        if (rows.isEmpty()) throw ApiException.notFound("App 线上内容不存在");
        return rows.get(0);
    }

    private DeliveryModels.Content contentRow(ResultSet rs, int row) throws SQLException {
        var data = json(rs.getString("data_json"));
        normalizeUrlField(data, "videoUrl");
        normalizeUrlField(data, "imageUrl");
        return new DeliveryModels.Content(
                rs.getString("content_id"), rs.getString("content_type"), rs.getString("slug"),
                rs.getString("locale"), rs.getString("title"), rs.getString("summary"),
                externalUrl(properties.publicBaseUrl(), rs.getString("cover_url")), data,
                rs.getBoolean("featured"), rs.getInt("sort_weight"));
    }

    private void normalizeUrlField(JsonNode data, String field) {
        if (!(data instanceof ObjectNode object) || !data.hasNonNull(field)) return;
        object.put(field, externalUrl(properties.publicBaseUrl(), data.get(field).asText()));
    }

    private String requiredView(String type) {
        var view = CONTENT_VIEWS.get(type);
        if (view == null) throw new IllegalArgumentException("不支持的 App 内容类型: " + type);
        return view;
    }

    static String externalUrl(String baseUrl, String value) {
        if (value == null || value.isBlank()) return null;
        var path = value.trim();
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        if (baseUrl == null || baseUrl.isBlank()) return path;
        return baseUrl.replaceAll("/$", "") + (path.startsWith("/") ? path : "/" + path);
    }

    private JsonNode json(String value) {
        try { return mapper.readTree(value); }
        catch (JacksonException exception) { throw new IllegalStateException("App 内容视图 JSON 无法解析", exception); }
    }
}
