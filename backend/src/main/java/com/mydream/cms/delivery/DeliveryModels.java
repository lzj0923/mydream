package com.mydream.cms.delivery;

import tools.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;

public final class DeliveryModels {
    private DeliveryModels() {}

    public record NavigationItem(String id, String parentId, String label, String linkType, String linkValue,
                                 String target, int order, List<NavigationItem> children) {}
    public record Navigation(String key, String name, List<NavigationItem> items) {}
    public record Block(String id, String type, int schemaVersion, String zone, int order, JsonNode props, JsonNode style) {}
    public record Page(String id, String path, String key, String locale, String title, JsonNode seo, List<Block> blocks) {}
    public record SiteShell(String siteKey, String name, String locale, String releaseId, int releaseNo,
                            JsonNode config, JsonNode theme, Map<String, Navigation> navigations) {}
    public record Bootstrap(SiteShell site, Page page) {}
    public record Content(String id, String type, String slug, String locale, String title, String summary,
                          String coverUrl, JsonNode data, boolean featured, int sortWeight) {}
}
