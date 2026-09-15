package com.mydream.cms.studio;

import tools.jackson.databind.JsonNode;
import com.mydream.cms.shared.ApiException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class BlockRegistry {
    private static final Set<String> FORBIDDEN_KEYS = Set.of(
            "html", "rawHtml", "css", "script", "javascript", "dangerouslySetInnerHTML"
    );
    private static final Set<String> STYLE_KEYS = Set.of(
            "variant", "background", "backgroundMediaId", "color", "titleColor", "textColor",
            "align", "verticalAlign", "maxWidth", "minHeight", "paddingTop", "paddingBottom", "hiddenMobile",
            "hiddenDesktop", "motion", "overlay", "columns", "gap", "radius",
            "backgroundColor", "descriptionColor", "eyebrowColor", "titleFontSize", "copyWidth"
    );

    private final JdbcTemplate jdbc;

    public BlockRegistry(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long definitionId(String type, int schemaVersion) {
        var ids = jdbc.query("""
                SELECT id FROM cms_block_definition
                WHERE type_key=? AND schema_version=? AND enabled=TRUE
                """, (rs, rowNum) -> rs.getLong(1), type, schemaVersion);
        if (ids.isEmpty()) throw ApiException.invalid("未知或已停用的区块类型: " + type + "@" + schemaVersion);
        return ids.get(0);
    }

    public void validate(List<StudioModels.BlockDraft> blocks) {
        if (blocks == null) return;
        if (blocks.size() > 100) throw ApiException.invalid("单个页面最多允许 100 个区块");
        var ids = new HashSet<String>();
        for (var block : blocks) {
            definitionId(block.type(), block.schemaVersion());
            if (block.id() != null && !ids.add(block.id())) throw ApiException.invalid("区块 ID 重复: " + block.id());
            rejectForbiddenKeys(block.props(), "props");
            rejectForbiddenKeys(block.style(), "style");
            validateStyle(block.style());
        }
    }

    static void validateStyle(JsonNode style) {
        style.propertyNames().forEach(key -> {
            if (!STYLE_KEYS.contains(key)) throw ApiException.invalid("不允许的样式字段: " + key);
        });
        validateStyleRanges(style);
    }

    private void rejectForbiddenKeys(JsonNode node, String path) {
        if (node == null || node.isNull()) return;
        if (node.isObject()) {
            node.properties().forEach(entry -> {
                if (FORBIDDEN_KEYS.contains(entry.getKey())) throw ApiException.invalid("不允许的字段: " + path + "." + entry.getKey());
                rejectForbiddenKeys(entry.getValue(), path + "." + entry.getKey());
            });
        } else if (node.isArray()) {
            for (int index = 0; index < node.size(); index++) rejectForbiddenKeys(node.get(index), path + "[" + index + "]");
        }
    }

    private static void validateStyleRanges(JsonNode style) {
        for (var key : List.of("minHeight", "maxWidth", "paddingTop", "paddingBottom", "gap", "radius", "titleFontSize", "copyWidth")) {
            var value = style.get(key);
            if (value != null && (!value.canConvertToInt() || value.intValue() < 0 || value.intValue() > 2400)) {
                throw ApiException.invalid("样式字段超出允许范围: " + key);
            }
        }
        var columns = style.get("columns");
        if (columns != null && (!columns.canConvertToInt() || columns.intValue() < 1 || columns.intValue() > 6)) {
            throw ApiException.invalid("columns 必须在 1 到 6 之间");
        }
    }
}
