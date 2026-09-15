package com.mydream.cms.media;

import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import com.mydream.cms.studio.StudioFacade;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.charset.StandardCharsets;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaService {
    private static final Set<String> ALLOWED_MIME = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
            "video/mp4", "video/webm", "audio/mpeg", "audio/ogg", "audio/wav",
            "font/woff", "font/woff2", "application/font-woff", "application/pdf"
    );
    private static final Map<String, String> SAFE_EXTENSIONS = Map.ofEntries(
            Map.entry("image/jpeg", ".jpg"), Map.entry("image/png", ".png"),
            Map.entry("image/webp", ".webp"), Map.entry("image/gif", ".gif"),
            Map.entry("image/svg+xml", ".svg"), Map.entry("video/mp4", ".mp4"),
            Map.entry("video/webm", ".webm"), Map.entry("audio/mpeg", ".mp3"),
            Map.entry("audio/ogg", ".ogg"), Map.entry("audio/wav", ".wav"),
            Map.entry("font/woff", ".woff"), Map.entry("font/woff2", ".woff2"),
            Map.entry("application/font-woff", ".woff"), Map.entry("application/pdf", ".pdf")
    );
    private static final Map<String, String> MIME_BY_EXTENSION = Map.ofEntries(
            Map.entry(".jpg", "image/jpeg"), Map.entry(".jpeg", "image/jpeg"),
            Map.entry(".png", "image/png"), Map.entry(".webp", "image/webp"),
            Map.entry(".gif", "image/gif"), Map.entry(".svg", "image/svg+xml"),
            Map.entry(".mp4", "video/mp4"), Map.entry(".webm", "video/webm"),
            Map.entry(".mp3", "audio/mpeg"), Map.entry(".ogg", "audio/ogg"),
            Map.entry(".wav", "audio/wav"), Map.entry(".woff", "font/woff"),
            Map.entry(".woff2", "font/woff2"), Map.entry(".pdf", "application/pdf")
    );

    private final JdbcTemplate jdbc;
    private final StudioFacade studio;
    private final CmsProperties properties;
    private Path root;

    public MediaService(JdbcTemplate jdbc, StudioFacade studio, CmsProperties properties) {
        this.jdbc = jdbc;
        this.studio = studio;
        this.properties = properties;
    }

    @PostConstruct
    void initialize() throws IOException {
        root = properties.uploadDirectory().toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public List<MediaView> list(String sitePublicId) {
        return jdbc.query("""
                SELECT m.public_id,m.asset_type,m.display_name,m.original_name,m.storage_key,m.mime_type,m.size_bytes,
                       m.alt_text,m.caption,m.status,m.lock_version,m.created_at
                FROM cms_media_asset m JOIN cms_site s ON s.id=m.site_id
                WHERE s.public_id=? AND m.status<>'DELETED' ORDER BY m.created_at DESC
                """, (rs, row) -> new MediaView(rs.getString("public_id"), rs.getString("asset_type"),
                rs.getString("display_name"), rs.getString("original_name"), mediaUrl(rs.getString("storage_key")), rs.getString("mime_type"),
                rs.getLong("size_bytes"), rs.getString("alt_text"), rs.getString("caption"),
                rs.getString("status"), rs.getInt("lock_version"), rs.getTimestamp("created_at").toInstant()), sitePublicId);
    }

    @Transactional
    public MediaView upload(String sitePublicId, MultipartFile file, String name, String altText, String caption, Authentication auth) {
        if (file == null || file.isEmpty()) throw ApiException.invalid("请选择要上传的文件");
        var mime = file.getContentType() == null ? "application/octet-stream" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_MIME.contains(mime)) throw ApiException.invalid("不支持的文件类型: " + mime);
        var siteId = studio.siteDbId(sitePublicId);
        var publicId = Ids.next();
        var storageKey = sitePublicId + "/" + publicId + SAFE_EXTENSIONS.get(mime);
        var target = safePath(storageKey);
        try {
            Files.createDirectories(target.getParent());
            var digest = MessageDigest.getInstance("SHA-256");
            try (InputStream source = new DigestInputStream(file.getInputStream(), digest)) {
                Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
            }
            var checksum = HexFormat.of().formatHex(digest.digest());
            var originalName = safeOriginalName(file.getOriginalFilename());
            jdbc.update("""
                    INSERT INTO cms_media_asset(public_id,site_id,asset_type,original_name,display_name,storage_key,mime_type,size_bytes,
                                                alt_text,caption,checksum_sha256,status,created_by)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,'READY',?)
                    """, publicId, siteId, assetType(mime), originalName, displayName(name, originalName), storageKey, mime,
                    Files.size(target), trim(altText, 500), trim(caption, 1000), checksum, studio.actorId(auth));
        } catch (IOException | NoSuchAlgorithmException exception) {
            try { Files.deleteIfExists(target); } catch (IOException ignored) {}
            throw new IllegalStateException("媒体文件保存失败", exception);
        }
        return find(publicId);
    }

    @Transactional
    public MediaView update(String mediaId, UpdateMediaRequest request) {
        var updated = jdbc.update("""
                UPDATE cms_media_asset SET display_name=COALESCE(NULLIF(?,''),display_name),alt_text=?,caption=?,lock_version=lock_version+1
                WHERE public_id=? AND lock_version=? AND status<>'DELETED'
                """, trim(request.displayName(), 255), trim(request.altText(), 500), trim(request.caption(), 1000), mediaId, request.lockVersion());
        if (updated != 1) throw ApiException.conflict("媒体信息已变化，请刷新后重试");
        return find(mediaId);
    }

    @Transactional
    public void archive(String mediaId) {
        var references = jdbc.queryForObject("""
                SELECT
                  (SELECT COUNT(*) FROM cms_media_reference r JOIN cms_media_asset m ON m.id=r.media_asset_id WHERE m.public_id=?) +
                  (SELECT COUNT(*) FROM cms_media_alias a JOIN cms_media_asset m ON m.id=a.media_asset_id WHERE m.public_id=?)
                """, Integer.class, mediaId, mediaId);
        if (references != null && references > 0) throw ApiException.conflict("该媒体仍被页面或内容引用，不能删除");
        if (jdbc.update("UPDATE cms_media_asset SET status='DELETED' WHERE public_id=? AND status<>'DELETED'", mediaId) != 1) {
            throw ApiException.notFound("媒体不存在");
        }
    }

    public StoredMedia stored(String storageKey) {
        var rows = jdbc.query("SELECT original_name,mime_type,size_bytes,storage_key FROM cms_media_asset WHERE storage_key=? AND status='READY'",
                (rs, row) -> new StoredMedia(rs.getString("original_name"), rs.getString("mime_type"),
                        rs.getLong("size_bytes"), resource(rs.getString("storage_key"))), storageKey);
        if (rows.isEmpty()) throw ApiException.notFound("媒体不存在");
        return rows.get(0);
    }

    public StoredMedia storedAlias(String siteKey, String value) {
        var alias = normalizeAlias(value);
        var rows = jdbc.query("""
                SELECT m.original_name,m.mime_type,m.size_bytes,m.storage_key
                FROM cms_media_alias a
                JOIN cms_site s ON s.id=a.site_id
                JOIN cms_media_asset m ON m.id=a.media_asset_id
                WHERE s.site_key=? AND a.alias_key=? AND m.status='READY'
                """, (rs, row) -> new StoredMedia(rs.getString("original_name"), rs.getString("mime_type"),
                rs.getLong("size_bytes"), resource(rs.getString("storage_key"))), siteKey, alias);
        if (rows.isEmpty()) throw ApiException.notFound("媒体资源不存在");
        return rows.get(0);
    }

    public int importLegacyAssets(Path directory, String siteKey) {
        var sourceRoot = directory.toAbsolutePath().normalize();
        if (!Files.isDirectory(sourceRoot)) return 0;
        var sites = jdbc.query("SELECT id,public_id FROM cms_site WHERE site_key=?",
                (rs, row) -> new SiteRef(rs.getLong("id"), rs.getString("public_id")), siteKey);
        if (sites.isEmpty()) return 0;
        var site = sites.get(0);
        var imported = 0;
        try (var paths = Files.walk(sourceRoot)) {
            for (var source : paths.filter(Files::isRegularFile).sorted().toList()) {
                var mime = mimeFor(source);
                if (mime == null) continue;
                var alias = normalizeAlias(sourceRoot.relativize(source).toString().replace('\\', '/'));
                var existingAlias = jdbc.queryForObject("SELECT COUNT(*) FROM cms_media_alias WHERE site_id=? AND alias_key=?", Integer.class, site.id(), alias);
                if (existingAlias != null && existingAlias > 0) continue;
                var publicId = UUID.nameUUIDFromBytes((siteKey + ":" + alias).getBytes(StandardCharsets.UTF_8)).toString();
                var assetIds = jdbc.query("SELECT id FROM cms_media_asset WHERE public_id=?", (rs, row) -> rs.getLong(1), publicId);
                long assetId;
                if (assetIds.isEmpty()) {
                    var storageKey = site.publicId() + "/managed/" + publicId + SAFE_EXTENSIONS.get(mime);
                    var target = safePath(storageKey);
                    Files.createDirectories(target.getParent());
                    var digest = MessageDigest.getInstance("SHA-256");
                    try (InputStream input = new DigestInputStream(Files.newInputStream(source), digest)) {
                        Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
                    }
                    var checksum = HexFormat.of().formatHex(digest.digest());
                    var originalName = safeOriginalName(source.getFileName().toString());
                    jdbc.update("""
                            INSERT INTO cms_media_asset(public_id,site_id,asset_type,original_name,display_name,storage_key,
                                                        mime_type,size_bytes,alt_text,checksum_sha256,status)
                            VALUES (?,?,?,?,?,?,?,?,?,?,'READY')
                            """, publicId, site.id(), assetType(mime), originalName, alias, storageKey, mime,
                            Files.size(target), originalName, checksum);
                    assetId = jdbc.queryForObject("SELECT id FROM cms_media_asset WHERE public_id=?", Long.class, publicId);
                } else {
                    assetId = assetIds.get(0);
                }
                jdbc.update("INSERT INTO cms_media_alias(site_id,media_asset_id,alias_key) VALUES (?,?,?)", site.id(), assetId, alias);
                imported++;
            }
        } catch (IOException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("静态资源导入媒体库失败", exception);
        }
        return imported;
    }

    private MediaView find(String publicId) {
        var rows = jdbc.query("""
                SELECT public_id,asset_type,display_name,original_name,storage_key,mime_type,size_bytes,alt_text,caption,status,lock_version,created_at
                FROM cms_media_asset WHERE public_id=?
                """, (rs, row) -> new MediaView(rs.getString("public_id"), rs.getString("asset_type"),
                rs.getString("display_name"), rs.getString("original_name"), mediaUrl(rs.getString("storage_key")), rs.getString("mime_type"),
                rs.getLong("size_bytes"), rs.getString("alt_text"), rs.getString("caption"),
                rs.getString("status"), rs.getInt("lock_version"), rs.getTimestamp("created_at").toInstant()), publicId);
        if (rows.isEmpty()) throw ApiException.notFound("媒体不存在");
        return rows.get(0);
    }

    private Resource resource(String storageKey) {
        try {
            var resource = new UrlResource(safePath(storageKey).toUri());
            if (!resource.exists() || !resource.isReadable()) throw ApiException.notFound("媒体文件不存在");
            return resource;
        } catch (java.net.MalformedURLException exception) {
            throw ApiException.notFound("媒体文件不存在");
        }
    }

    private Path safePath(String storageKey) {
        var path = root.resolve(storageKey).normalize();
        if (!path.startsWith(root)) throw ApiException.invalid("非法媒体路径");
        return path;
    }

    private String mediaUrl(String storageKey) {
        return properties.publicBaseUrl().replaceAll("/$", "") + "/media/" + storageKey;
    }

    private String mimeFor(Path path) {
        var name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        var index = name.lastIndexOf('.');
        return index < 0 ? null : MIME_BY_EXTENSION.get(name.substring(index));
    }

    static String normalizeAlias(String value) {
        var alias = value == null ? "" : value.replace('\\', '/').replaceFirst("^/+", "");
        if (alias.isBlank() || alias.contains("..") || alias.contains("//")) throw ApiException.invalid("非法媒体资源标识");
        return alias;
    }

    private String assetType(String mime) {
        if (mime.startsWith("image/")) return "IMAGE";
        if (mime.startsWith("video/")) return "VIDEO";
        if (mime.startsWith("audio/")) return "AUDIO";
        if (mime.contains("font") || mime.contains("woff")) return "FONT";
        return "DOCUMENT";
    }

    private String safeOriginalName(String value) {
        if (value == null || value.isBlank()) return "upload";
        return Path.of(value).getFileName().toString().replaceAll("[\\r\\n]", "_");
    }

    private String displayName(String value, String fallback) {
        var name = trim(value, 255);
        return name == null || name.isBlank() ? fallback : name.replaceAll("[\\r\\n]", " ");
    }

    private String trim(String value, int max) {
        if (value == null) return null;
        var normalized = value.trim();
        return normalized.length() <= max ? normalized : normalized.substring(0, max);
    }

    public record UpdateMediaRequest(int lockVersion, String displayName, String altText, String caption) {}
    public record MediaView(String id, String type, String displayName, String originalName, String url, String mimeType, long size,
                            String altText, String caption, String status, int lockVersion, Instant createdAt) {}
    public record StoredMedia(String originalName, String mimeType, long size, Resource resource) {}
    private record SiteRef(long id, String publicId) {}
}
