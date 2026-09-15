package com.mydream.cms.media;

import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import com.mydream.cms.studio.StudioFacade;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FontService {
    private static final Set<String> FORMATS = Set.of("woff", "woff2");
    private final JdbcTemplate jdbc;
    private final StudioFacade studio;

    public FontService(JdbcTemplate jdbc, StudioFacade studio) {
        this.jdbc = jdbc;
        this.studio = studio;
    }

    public List<FontView> list(String sitePublicId) {
        var families = jdbc.query("""
                SELECT f.id,f.public_id,f.name,f.fallback_stack,f.enabled
                FROM cms_font_family f JOIN cms_site s ON s.id=f.site_id WHERE s.public_id=? ORDER BY f.name
                """, (rs, row) -> new FamilyRow(rs.getLong("id"), rs.getString("public_id"), rs.getString("name"),
                rs.getString("fallback_stack"), rs.getBoolean("enabled")), sitePublicId);
        return families.stream().map(family -> new FontView(family.publicId(), family.name(), family.fallback(), family.enabled(),
                jdbc.query("""
                        SELECT m.public_id,x.weight,x.style,x.format FROM cms_font_face x JOIN cms_media_asset m ON m.id=x.media_asset_id
                        WHERE x.font_family_id=? ORDER BY x.weight,x.style
                        """, (rs, row) -> new FaceView(rs.getString("public_id"), rs.getInt("weight"),
                        rs.getString("style"), rs.getString("format")), family.id()))).toList();
    }

    @Transactional
    public FontView create(String sitePublicId, CreateFontRequest request) {
        var siteId = studio.siteDbId(sitePublicId);
        var id = Ids.next();
        jdbc.update("INSERT INTO cms_font_family(public_id,site_id,name,fallback_stack) VALUES (?,?,?,?)",
                id, siteId, request.name(), request.fallbackStack());
        return find(sitePublicId, id);
    }

    @Transactional
    public FontView addFace(String sitePublicId, String fontId, AddFaceRequest request) {
        var familyIds = jdbc.query("""
                SELECT f.id FROM cms_font_family f JOIN cms_site s ON s.id=f.site_id WHERE s.public_id=? AND f.public_id=?
                """, (rs, row) -> rs.getLong(1), sitePublicId, fontId);
        if (familyIds.isEmpty()) throw ApiException.notFound("字体族不存在");
        var mediaIds = jdbc.query("""
                SELECT m.id FROM cms_media_asset m JOIN cms_site s ON s.id=m.site_id
                WHERE s.public_id=? AND m.public_id=? AND m.asset_type='FONT' AND m.status='READY'
                """, (rs, row) -> rs.getLong(1), sitePublicId, request.mediaId());
        if (mediaIds.isEmpty()) throw ApiException.invalid("字体媒体不存在或类型不正确");
        var format = request.format().toLowerCase(java.util.Locale.ROOT);
        if (!FORMATS.contains(format)) throw ApiException.invalid("字体格式仅允许 woff/woff2");
        jdbc.update("INSERT INTO cms_font_face(font_family_id,media_asset_id,weight,style,format) VALUES (?,?,?,?,?)",
                familyIds.get(0), mediaIds.get(0), request.weight(), request.style(), format);
        return find(sitePublicId, fontId);
    }

    private FontView find(String siteId, String fontId) {
        return list(siteId).stream().filter(font -> font.id().equals(fontId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("字体族不存在"));
    }

    public record CreateFontRequest(@NotBlank @Size(max = 120) String name,
                                    @NotBlank @Size(max = 500) String fallbackStack) {}
    public record AddFaceRequest(@NotBlank String mediaId, @Min(100) @Max(900) int weight,
                                 @NotBlank @Pattern(regexp = "normal|italic") String style,
                                 @NotBlank String format) {}
    public record FaceView(String mediaId, int weight, String style, String format) {}
    public record FontView(String id, String name, String fallbackStack, boolean enabled, List<FaceView> faces) {}
    private record FamilyRow(long id, String publicId, String name, String fallback, boolean enabled) {}
}
