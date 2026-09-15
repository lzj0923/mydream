package com.mydream.cms.delivery;

import com.mydream.cms.config.AppContentDatabase;
import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.shared.ApiException;
import com.mydream.cms.studio.StudioModels;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@ConditionalOnProperty(prefix = "cms.app-content", name = {"enabled", "write-enabled"}, havingValue = "true")
public class AppContentWriter {
    private final JdbcTemplate appJdbc;
    private final JdbcTemplate cmsJdbc;
    private final CmsProperties cmsProperties;
    private final ObjectMapper mapper;

    public AppContentWriter(AppContentDatabase database, JdbcTemplate cmsJdbc,
                            CmsProperties cmsProperties, ObjectMapper mapper) {
        this.appJdbc = database.jdbc();
        this.cmsJdbc = cmsJdbc;
        this.cmsProperties = cmsProperties;
        this.mapper = mapper;
    }

    public boolean supports(String type) {
        return "work".equals(type) || "episode".equals(type);
    }

    public void upsert(StudioModels.ContentDraft content) {
        if (!supports(content.type())) return;
        try {
            if ("work".equals(content.type())) upsertWork(content);
            else upsertEpisode(content);
        } catch (ApiException exception) {
            throw exception;
        } catch (DataAccessException exception) {
            throw ApiException.unavailable("401 App 数据库写入失败，请检查数据库连接后重试");
        }
    }

    public void archive(StudioModels.ContentDraft content) {
        if (!supports(content.type())) return;
        try {
            var table = "work".equals(content.type()) ? "fa_short_drama" : "fa_short_drama_episode";
            var appId = longValue(content.data(), "appId", 0);
            int changed;
            if (appId > 0) {
                changed = appJdbc.update("UPDATE " + table + " SET status='inactive',web_visible=0,web_revision=web_revision+1 WHERE id=?", appId);
            } else {
                changed = appJdbc.update("UPDATE " + table + " SET status='inactive',web_visible=0,web_revision=web_revision+1 WHERE web_public_id=? OR (web_slug=? AND web_locale=?)",
                        content.id(), content.slug(), content.locale());
            }
            if (changed == 0) throw ApiException.notFound("401 App 中没有找到对应内容");
            if ("episode".equals(content.type())) refreshDramaCount(parentAppId(content));
        } catch (ApiException exception) {
            throw exception;
        } catch (DataAccessException exception) {
            throw ApiException.unavailable("401 App 数据库删除同步失败，请稍后重试");
        }
    }

    private void upsertWork(StudioModels.ContentDraft content) {
        var data = content.data();
        var cover = firstNonBlank(mediaUrl(content.coverMediaId()), text(data, "imageUrl"));
        cover = absoluteCmsUrl(cover);
        var visible = boolValue(data, "visible", true);
        var status = visible ? "published" : "draft";
        var complete = containsAny(text(data, "episodeLabel"), "已完結", "已完结", "全 ");
        var episodeCount = intValue(data, "episodeCount", 0);
        var publishedAt = publishedAt(data);
        var appId = longValue(data, "appId", 0);
        if (appId > 0) {
            var changed = appJdbc.update("""
                    UPDATE fa_short_drama
                    SET title=?,description=?,cover_image=COALESCE(NULLIF(?,''),cover_image),status=?,is_must=?,
                        drama_count=IF(?>0,?,drama_count),is_complete=?,web_public_id=?,web_slug=?,web_locale=?,
                        web_visible=?,web_featured=?,web_sort_weight=?,web_published_at=COALESCE(web_published_at,?),
                        web_revision=web_revision+1
                    WHERE id=?
                    """, content.title(), content.summary(), cover, status, content.featured(),
                    episodeCount, episodeCount, complete, content.id(), content.slug(), content.locale(), visible,
                    content.featured(), content.sortWeight(), publishedAt, appId);
            if (changed == 0) throw ApiException.notFound("401 App 中没有找到对应短剧");
            return;
        }
        appJdbc.update("""
                INSERT INTO fa_short_drama
                  (admin_id,title,description,cover_image,total_views,unlock_price,status,is_must,drama_count,
                   is_allregion,is_complete,is_landscape,web_public_id,web_slug,web_locale,web_visible,
                   web_featured,web_sort_weight,web_published_at,web_revision)
                VALUES (0,?,?,?,0,0,?,?,?,0,?,0,?,?,?,?,?,?,?,1)
                ON DUPLICATE KEY UPDATE
                  title=VALUES(title),description=VALUES(description),cover_image=COALESCE(NULLIF(VALUES(cover_image),''),cover_image),
                  status=VALUES(status),is_must=VALUES(is_must),drama_count=IF(VALUES(drama_count)>0,VALUES(drama_count),drama_count),
                  is_complete=VALUES(is_complete),web_slug=VALUES(web_slug),web_locale=VALUES(web_locale),
                  web_visible=VALUES(web_visible),web_featured=VALUES(web_featured),web_sort_weight=VALUES(web_sort_weight),
                  web_published_at=COALESCE(web_published_at,VALUES(web_published_at)),web_revision=web_revision+1
                """, content.title(), content.summary(), cover, status, content.featured(), episodeCount, complete,
                content.id(), content.slug(), content.locale(), visible, content.featured(), content.sortWeight(), publishedAt);
    }

    private void upsertEpisode(StudioModels.ContentDraft content) {
        var data = content.data();
        var dramaId = parentAppId(content);
        var videoUrl = absoluteCmsUrl(text(data, "videoUrl"));
        var thumbnail = absoluteCmsUrl(mediaUrl(content.coverMediaId()));
        var visible = boolValue(data, "visible", true);
        var status = visible && videoUrl != null ? "published" : "draft";
        var episodeNumber = Math.max(1, intValue(data, "episodeNumber", 1));
        var unlockPrice = decimalValue(data, "unlockPrice", BigDecimal.ZERO);
        var publishedAt = publishedAt(data);
        var appId = longValue(data, "appId", 0);
        if (appId > 0) {
            var changed = appJdbc.update("""
                    UPDATE fa_short_drama_episode
                    SET drama_id=?,title=?,video_url=?,thumbnail=?,unlock_price=?,status=?,drama_num=?,description=?,
                        web_public_id=?,web_slug=?,web_locale=?,web_visible=?,web_featured=?,web_sort_weight=?,
                        web_published_at=COALESCE(web_published_at,?),web_revision=web_revision+1
                    WHERE id=?
                    """, dramaId, content.title(), nullToEmpty(videoUrl), thumbnail, unlockPrice, status, episodeNumber,
                    content.summary(), content.id(), content.slug(), content.locale(), visible, content.featured(),
                    content.sortWeight(), publishedAt, appId);
            if (changed == 0) throw ApiException.notFound("401 App 中没有找到对应剧集");
        } else {
            appJdbc.update("""
                    INSERT INTO fa_short_drama_episode
                      (admin_id,drama_id,title,video_url,thumbnail,views,unlock_price,ad_unlock_enabled,ad_unlock_count,
                       status,likes,drama_num,description,video_attachment_id,web_public_id,web_slug,web_locale,
                       web_visible,web_featured,web_sort_weight,web_published_at,web_revision)
                    VALUES (0,?,?,?, ?,0,?,0,0,?,0,?,?,NULL,?,?,?,?,?,?,?,1)
                    ON DUPLICATE KEY UPDATE
                      drama_id=VALUES(drama_id),title=VALUES(title),video_url=VALUES(video_url),thumbnail=VALUES(thumbnail),
                      unlock_price=VALUES(unlock_price),status=VALUES(status),drama_num=VALUES(drama_num),description=VALUES(description),
                      web_slug=VALUES(web_slug),web_locale=VALUES(web_locale),web_visible=VALUES(web_visible),
                      web_featured=VALUES(web_featured),web_sort_weight=VALUES(web_sort_weight),
                      web_published_at=COALESCE(web_published_at,VALUES(web_published_at)),web_revision=web_revision+1
                    """, dramaId, content.title(), nullToEmpty(videoUrl), thumbnail, unlockPrice, status, episodeNumber,
                    content.summary(), content.id(), content.slug(), content.locale(), visible, content.featured(),
                    content.sortWeight(), publishedAt);
        }
        refreshDramaCount(dramaId);
    }

    private long parentAppId(StudioModels.ContentDraft content) {
        var relation = content.relations().stream().filter(item -> "episode-of".equals(item.type())).findFirst()
                .orElseThrow(() -> ApiException.invalid("剧集没有关联所属作品"));
        var parents = cmsJdbc.query("""
                SELECT e.public_id,e.slug,v.data_json
                FROM cms_content_entry e
                JOIN cms_content_version v ON v.content_entry_id=e.id
                  AND v.version_no=(SELECT MAX(latest.version_no) FROM cms_content_version latest WHERE latest.content_entry_id=e.id)
                WHERE e.public_id=? AND e.archived=FALSE
                """, (rs, row) -> new ParentRef(rs.getString("public_id"), rs.getString("slug"), json(rs.getString("data_json"))),
                relation.targetContentId());
        if (parents.isEmpty()) throw ApiException.invalid("所属作品不存在，请刷新后重试");
        var parent = parents.get(0);
        var appId = longValue(parent.data(), "appId", 0);
        List<Long> ids = appId > 0
                ? appJdbc.query("SELECT id FROM fa_short_drama WHERE id=?", (rs, row) -> rs.getLong(1), appId)
                : appJdbc.query("SELECT id FROM fa_short_drama WHERE web_public_id=? OR web_slug=? ORDER BY web_public_id=? DESC LIMIT 1",
                        (rs, row) -> rs.getLong(1), parent.id(), parent.slug(), parent.id());
        if (ids.isEmpty()) throw ApiException.conflict("所属作品尚未同步到 401 App，请先保存一次作品后再添加剧集");
        return ids.get(0);
    }

    private void refreshDramaCount(long dramaId) {
        appJdbc.update("""
                UPDATE fa_short_drama
                SET drama_count=(SELECT COUNT(*) FROM fa_short_drama_episode WHERE drama_id=? AND status<>'inactive'),
                    web_revision=web_revision+1
                WHERE id=?
                """, dramaId, dramaId);
    }

    private String mediaUrl(String publicId) {
        if (publicId == null || publicId.isBlank()) return null;
        var rows = cmsJdbc.query("SELECT storage_key FROM cms_media_asset WHERE public_id=? AND status='READY'",
                (rs, row) -> rs.getString(1), publicId);
        if (rows.isEmpty()) return null;
        return cmsProperties.publicBaseUrl().replaceAll("/$", "") + "/media/" + rows.get(0);
    }

    private String absoluteCmsUrl(String value) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
        return cmsProperties.publicBaseUrl().replaceAll("/$", "") + (normalized.startsWith("/") ? normalized : "/" + normalized);
    }

    private Timestamp publishedAt(JsonNode data) {
        var value = text(data, "publishedAt");
        if (value != null) {
            try {
                return Timestamp.from(LocalDate.parse(value.replace('/', '-')).atStartOfDay().toInstant(ZoneOffset.UTC));
            } catch (DateTimeParseException ignored) {}
        }
        return Timestamp.from(Instant.now());
    }

    private JsonNode json(String value) {
        try { return mapper.readTree(value); }
        catch (JacksonException exception) { throw new IllegalStateException("CMS 内容 JSON 无法解析", exception); }
    }

    static String statusForEpisode(boolean visible, String videoUrl) {
        return visible && videoUrl != null && !videoUrl.isBlank() ? "published" : "draft";
    }

    private static String text(JsonNode data, String field) {
        if (data == null || !data.hasNonNull(field)) return null;
        var value = data.get(field).asText().trim();
        return value.isEmpty() ? null : value;
    }

    private static boolean boolValue(JsonNode data, String field, boolean fallback) {
        return data != null && data.has(field) ? data.get(field).asBoolean(fallback) : fallback;
    }

    private static int intValue(JsonNode data, String field, int fallback) {
        return data != null && data.hasNonNull(field) ? data.get(field).asInt(fallback) : fallback;
    }

    private static long longValue(JsonNode data, String field, long fallback) {
        return data != null && data.hasNonNull(field) ? data.get(field).asLong(fallback) : fallback;
    }

    private static BigDecimal decimalValue(JsonNode data, String field, BigDecimal fallback) {
        var value = text(data, field);
        if (value == null) return fallback;
        try { return new BigDecimal(value); }
        catch (NumberFormatException ignored) { return fallback; }
    }

    private static boolean containsAny(String value, String... needles) {
        if (value == null) return false;
        for (var needle : needles) if (value.contains(needle)) return true;
        return false;
    }

    private static String firstNonBlank(String... values) {
        for (var value : values) if (value != null && !value.isBlank()) return value;
        return null;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private record ParentRef(String id, String slug, JsonNode data) {}
}
