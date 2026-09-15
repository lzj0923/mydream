package com.mydream.cms.delivery;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.shared.ApiException;
import com.mydream.cms.media.MediaReferenceResolver;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class SiteDelivery {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final CmsProperties properties;
    private final MediaReferenceResolver mediaReferences;
    private final ObjectProvider<AppContentDelivery> appContentProvider;

    public SiteDelivery(JdbcTemplate jdbc, ObjectMapper mapper, CmsProperties properties,
                        MediaReferenceResolver mediaReferences,
                        ObjectProvider<AppContentDelivery> appContentProvider) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.properties = properties;
        this.mediaReferences = mediaReferences;
        this.appContentProvider = appContentProvider;
    }

    public DeliveryModels.Bootstrap bootstrap(String siteKey, String path, String locale) {
        var release = release(siteKey);
        return new DeliveryModels.Bootstrap(shell(release), page(release, normalizePath(path), locale));
    }

    public DeliveryModels.SiteShell shell(String siteKey) {
        return shell(release(siteKey));
    }

    public DeliveryModels.Page page(String siteKey, String path, String locale) {
        return page(release(siteKey), normalizePath(path), locale);
    }

    public List<DeliveryModels.Content> content(String siteKey, String type, String locale, int limit, int offset) {
        var release = release(siteKey);
        return content(release, type, locale, null, limit, offset);
    }

    public List<DeliveryModels.Content> content(String siteKey, String type, String locale, String parentSlug,
                                                int limit, int offset) {
        var release = release(siteKey);
        return content(release, type, locale, parentSlug, limit, offset);
    }

    private List<DeliveryModels.Content> content(ReleaseRow release, String type, String locale, String parentSlug,
                                                 int limit, int offset) {
        var appContent = appContentProvider.getIfAvailable();
        if (appContent != null && appContent.supports(type)) {
            return appContent.content(type, locale, parentSlug, limit, offset);
        }
        return jdbc.query("""
                SELECT e.public_id,e.content_type,e.slug,e.locale,v.title,v.summary,m.storage_key,
                       JSON_UNQUOTE(JSON_EXTRACT(v.data_json,'$.externalCoverUrl')) external_cover_url,
                       v.data_json,v.featured,v.sort_weight
                FROM cms_release_content rc
                JOIN cms_content_entry e ON e.id=rc.content_entry_id
                JOIN cms_content_version v ON v.id=rc.content_version_id
                LEFT JOIN cms_media_asset m ON m.id=v.cover_media_id
                WHERE rc.release_id=? AND e.content_type=? AND (? IS NULL OR e.locale=?)
                  AND (? IS NULL OR EXISTS (
                    SELECT 1
                    FROM cms_content_relation relation_row
                    JOIN cms_content_entry parent ON parent.id=relation_row.target_entry_id
                    WHERE relation_row.source_version_id=v.id
                      AND relation_row.relation_type='episode-of'
                      AND parent.slug=?
                  ))
                ORDER BY v.featured DESC,v.sort_weight DESC,v.created_at DESC LIMIT ? OFFSET ?
                """, (rs, row) -> new DeliveryModels.Content(rs.getString("public_id"), rs.getString("content_type"),
                rs.getString("slug"), rs.getString("locale"), rs.getString("title"), rs.getString("summary"),
                contentCoverUrl(rs.getString("storage_key"), rs.getString("external_cover_url")),
                mediaReferences.resolve(json(rs.getString("data_json"))), rs.getBoolean("featured"),
                rs.getInt("sort_weight")), release.id(), type, locale, locale, parentSlug, parentSlug,
                normalizeContentLimit(limit), Math.max(offset, 0));
    }

    static int normalizeContentLimit(int limit) {
        return Math.min(Math.max(limit, 1), 500);
    }

    public DeliveryModels.Content contentItem(String siteKey, String type, String slug, String locale) {
        var release = release(siteKey);
        var appContent = appContentProvider.getIfAvailable();
        if (appContent != null && appContent.supports(type)) {
            return appContent.contentItem(type, slug, locale);
        }
        var rows = jdbc.query("""
                SELECT e.public_id,e.content_type,e.slug,e.locale,v.title,v.summary,m.storage_key,
                       JSON_UNQUOTE(JSON_EXTRACT(v.data_json,'$.externalCoverUrl')) external_cover_url,
                       v.data_json,v.featured,v.sort_weight
                FROM cms_release_content rc
                JOIN cms_content_entry e ON e.id=rc.content_entry_id
                JOIN cms_content_version v ON v.id=rc.content_version_id
                LEFT JOIN cms_media_asset m ON m.id=v.cover_media_id
                WHERE rc.release_id=? AND e.content_type=? AND e.slug=? AND (? IS NULL OR e.locale=?)
                """, (rs, row) -> new DeliveryModels.Content(rs.getString("public_id"), rs.getString("content_type"),
                rs.getString("slug"), rs.getString("locale"), rs.getString("title"), rs.getString("summary"),
                contentCoverUrl(rs.getString("storage_key"), rs.getString("external_cover_url")),
                mediaReferences.resolve(json(rs.getString("data_json"))), rs.getBoolean("featured"),
                rs.getInt("sort_weight")), release.id(), type, slug, locale, locale);
        if (rows.isEmpty()) throw ApiException.notFound("线上内容不存在");
        return rows.get(0);
    }

    private DeliveryModels.SiteShell shell(ReleaseRow release) {
        var config = mediaReferences.resolve(json(jdbc.queryForObject("SELECT config_json FROM cms_site_config_version WHERE id=?", String.class, release.configId())));
        var theme = json(jdbc.queryForObject("SELECT tokens_json FROM cms_theme_version WHERE id=?", String.class, release.themeId()));
        var navHeaders = jdbc.query("""
                SELECT n.nav_key,n.name,rn.navigation_version_id
                FROM cms_release_navigation rn JOIN cms_navigation n ON n.id=rn.navigation_id
                WHERE rn.release_id=? ORDER BY n.id
                """, (rs, row) -> new NavHeader(rs.getString("nav_key"), rs.getString("name"), rs.getLong("navigation_version_id")), release.id());
        var navigations = new LinkedHashMap<String, DeliveryModels.Navigation>();
        for (var nav : navHeaders) navigations.put(nav.key(), new DeliveryModels.Navigation(nav.key(), nav.name(), navigationItems(nav.versionId())));
        return new DeliveryModels.SiteShell(release.siteKey(), release.siteName(), release.locale(), release.publicId(),
                release.releaseNo(), config, theme, navigations);
    }

    private DeliveryModels.Page page(ReleaseRow release, String path, String locale) {
        var rows = jdbc.query("""
                SELECT p.public_id,p.path,p.page_key,p.locale,v.id version_id,v.title,v.seo_json
                FROM cms_release_page rp JOIN cms_page p ON p.id=rp.page_id JOIN cms_page_version v ON v.id=rp.page_version_id
                WHERE rp.release_id=? AND p.path=? AND (? IS NULL OR p.locale=?)
                """, (rs, row) -> new PageRow(rs.getString("public_id"), rs.getString("path"), rs.getString("page_key"),
                rs.getString("locale"), rs.getLong("version_id"), rs.getString("title"), json(rs.getString("seo_json"))),
                release.id(), path, locale, locale);
        if (rows.isEmpty()) throw ApiException.notFound("线上页面不存在");
        var page = rows.get(0);
        var blocks = jdbc.query("""
                SELECT b.public_id,d.type_key,d.schema_version,b.zone_key,b.sort_order,b.props_json,b.style_json
                FROM cms_page_block b JOIN cms_block_definition d ON d.id=b.block_definition_id
                WHERE b.page_version_id=? AND b.visible=TRUE ORDER BY b.zone_key,b.sort_order,b.id
                """, (rs, row) -> new DeliveryModels.Block(rs.getString("public_id"), rs.getString("type_key"),
                rs.getInt("schema_version"), rs.getString("zone_key"), rs.getInt("sort_order"),
                mediaReferences.resolve(json(rs.getString("props_json"))), mediaReferences.resolve(json(rs.getString("style_json")))), page.versionId());
        return new DeliveryModels.Page(page.id(), page.path(), page.key(), page.locale(), page.title(), page.seo(), blocks);
    }

    private List<DeliveryModels.NavigationItem> navigationItems(long versionId) {
        var rows = jdbc.query("""
                SELECT i.id,i.public_id,i.parent_id,i.label,i.link_type,i.link_value,i.target,i.sort_order
                FROM cms_navigation_item i WHERE i.navigation_version_id=? AND i.visible=TRUE ORDER BY i.sort_order,i.id
                """, (rs, row) -> new ItemRow(rs.getLong("id"), rs.getString("public_id"),
                (Long) rs.getObject("parent_id"), rs.getString("label"), rs.getString("link_type"),
                rs.getString("link_value"), rs.getString("target"), rs.getInt("sort_order")), versionId);
        var byParent = new LinkedHashMap<Long, List<ItemRow>>();
        for (var item : rows) byParent.computeIfAbsent(item.parentId(), ignored -> new ArrayList<>()).add(item);
        return toTree(byParent, null, null);
    }

    private List<DeliveryModels.NavigationItem> toTree(Map<Long, List<ItemRow>> byParent, Long parentId, String parentPublicId) {
        return byParent.getOrDefault(parentId, List.of()).stream().map(item -> new DeliveryModels.NavigationItem(
                item.publicId(), parentPublicId, item.label(), item.linkType(), item.linkValue(), item.target(), item.order(),
                toTree(byParent, item.id(), item.publicId()))).toList();
    }

    private ReleaseRow release(String siteKey) {
        var rows = jdbc.query("""
                SELECT r.id,r.public_id,r.release_no,r.site_config_version_id,r.theme_version_id,
                       s.site_key,s.name,s.default_locale
                FROM cms_site s JOIN cms_site_release r ON r.id=s.active_release_id WHERE s.site_key=?
                """, (rs, row) -> new ReleaseRow(rs.getLong("id"), rs.getString("public_id"), rs.getInt("release_no"),
                rs.getLong("site_config_version_id"), rs.getLong("theme_version_id"), rs.getString("site_key"),
                rs.getString("name"), rs.getString("default_locale")), siteKey);
        if (rows.isEmpty()) throw ApiException.notFound("站点尚未发布");
        return rows.get(0);
    }

    private String mediaUrl(String storageKey) {
        if (storageKey == null) return null;
        return properties.publicBaseUrl().replaceAll("/$", "") + "/media/" + storageKey;
    }

    private String contentCoverUrl(String storageKey, String externalCoverUrl) {
        var managedUrl = mediaUrl(storageKey);
        return managedUrl != null ? managedUrl : externalCoverUrl;
    }

    private String normalizePath(String value) {
        if (value == null || value.isBlank()) return "/";
        var path = value.trim().replaceAll("/{2,}", "/");
        return path.length() > 1 && path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
    }

    private JsonNode json(String value) {
        try { return mapper.readTree(value); }
        catch (JacksonException exception) { throw new IllegalStateException("数据库 JSON 无法解析", exception); }
    }

    private record ReleaseRow(long id, String publicId, int releaseNo, long configId, long themeId,
                              String siteKey, String siteName, String locale) {}
    private record NavHeader(String key, String name, long versionId) {}
    private record ItemRow(long id, String publicId, Long parentId, String label, String linkType,
                           String linkValue, String target, int order) {}
    private record PageRow(String id, String path, String key, String locale, long versionId, String title, JsonNode seo) {}
}
