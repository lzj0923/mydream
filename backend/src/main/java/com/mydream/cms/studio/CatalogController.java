package com.mydream.cms.studio;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.mydream.cms.shared.ApiException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin-api/v1")
public class CatalogController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public CatalogController(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @GetMapping("/sites")
    @PreAuthorize("hasAuthority('site.read')")
    public List<SiteView> sites() {
        return jdbc.query("SELECT public_id,site_key,name,primary_host,default_locale,lock_version FROM cms_site ORDER BY id",
                (rs, row) -> new SiteView(rs.getString("public_id"), rs.getString("site_key"), rs.getString("name"),
                        rs.getString("primary_host"), rs.getString("default_locale"), rs.getInt("lock_version")));
    }

    @GetMapping("/block-definitions")
    @PreAuthorize("hasAuthority('page.read')")
    public List<BlockDefinitionView> blockDefinitions() {
        return jdbc.query("""
                SELECT type_key,schema_version,display_name,props_schema_json,style_schema_json
                FROM cms_block_definition WHERE enabled=TRUE ORDER BY type_key,schema_version
                """, (rs, row) -> new BlockDefinitionView(rs.getString("type_key"), rs.getInt("schema_version"),
                rs.getString("display_name"), json(rs.getString("props_schema_json")), json(rs.getString("style_schema_json"))));
    }

    @GetMapping("/sites/{siteId}/themes")
    @PreAuthorize("hasAuthority('site.read')")
    public List<IdentityView> themes(@PathVariable String siteId) {
        return jdbc.query("""
                SELECT t.public_id,t.theme_key,t.name,t.lock_version FROM cms_theme t JOIN cms_site s ON s.id=t.site_id
                WHERE s.public_id=? ORDER BY t.name
                """, (rs, row) -> new IdentityView(rs.getString("public_id"), rs.getString("theme_key"),
                rs.getString("name"), rs.getInt("lock_version")), siteId);
    }

    @GetMapping("/sites/{siteId}/navigations")
    @PreAuthorize("hasAuthority('site.read')")
    public List<IdentityView> navigations(@PathVariable String siteId) {
        return jdbc.query("""
                SELECT n.public_id,n.nav_key,n.name,n.lock_version FROM cms_navigation n JOIN cms_site s ON s.id=n.site_id
                WHERE s.public_id=? ORDER BY n.name
                """, (rs, row) -> new IdentityView(rs.getString("public_id"), rs.getString("nav_key"),
                rs.getString("name"), rs.getInt("lock_version")), siteId);
    }

    private JsonNode json(String value) {
        try { return mapper.readTree(value); }
        catch (JacksonException exception) { throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "INVALID_SCHEMA", "区块定义无法解析"); }
    }

    public record SiteView(String id, String key, String name, String host, String locale, int lockVersion) {}
    public record IdentityView(String id, String key, String name, int lockVersion) {}
    public record BlockDefinitionView(String type, int schemaVersion, String name, JsonNode propsSchema, JsonNode styleSchema) {}
}
