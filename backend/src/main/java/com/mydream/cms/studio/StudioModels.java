package com.mydream.cms.studio;

import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class StudioModels {
    private StudioModels() {}

    public record BlockDraft(
            String id,
            @NotBlank String type,
            @Min(1) int schemaVersion,
            String zone,
            @Min(0) int order,
            boolean visible,
            @NotNull JsonNode props,
            @NotNull JsonNode style
    ) {}

    public record CreatePageRequest(
            @NotBlank @Pattern(regexp = "^/(?!/).*$|^/$") String path,
            @NotBlank @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String pageKey,
            @NotBlank String locale,
            @NotBlank @Size(max = 200) String title,
            @NotNull JsonNode seo,
            @Valid List<BlockDraft> blocks,
            @Size(max = 500) String changeNote
    ) {}

    public record SavePageRequest(
            @Min(0) int lockVersion,
            @NotBlank @Size(max = 200) String title,
            @NotNull JsonNode seo,
            @Valid List<BlockDraft> blocks,
            @Size(max = 500) String changeNote
    ) {}

    public record PageSummary(String id, String path, String pageKey, String locale, String title, boolean archived, int lockVersion) {}

    public record PageDraft(
            String id,
            String path,
            String pageKey,
            String locale,
            int lockVersion,
            int version,
            String versionId,
            String status,
            String title,
            JsonNode seo,
            List<BlockDraft> blocks,
            Instant createdAt
    ) {}

    public record CreateContentRequest(
            @NotBlank @Pattern(regexp = "^[a-z][a-z0-9-]{1,79}$") String type,
            @NotBlank @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String slug,
            @NotBlank String locale,
            @NotBlank @Size(max = 240) String title,
            @Size(max = 1200) String summary,
            String coverMediaId,
            @NotNull JsonNode data,
            boolean featured,
            int sortWeight,
            @Valid List<ContentRelationDraft> relations,
            @Size(max = 500) String changeNote
    ) {}

    public record SaveContentRequest(
            @Min(0) int lockVersion,
            @NotBlank @Size(max = 240) String title,
            @Size(max = 1200) String summary,
            String coverMediaId,
            @NotNull JsonNode data,
            boolean featured,
            int sortWeight,
            @Valid List<ContentRelationDraft> relations,
            @Size(max = 500) String changeNote
    ) {}

    public record ContentRelationDraft(
            @NotBlank @Pattern(regexp = "^[a-z][a-z0-9-]{1,79}$") String type,
            @NotBlank String targetContentId,
            String targetTitle,
            @Min(0) int order
    ) {}

    public record ContentSummary(String id, String type, String slug, String locale, String title, boolean featured,
                                 boolean archived, int lockVersion, String relatedWorkId, String relatedWorkTitle,
                                 String episodeNumber, String publishedAt) {}

    public record ContentDraft(
            String id,
            String type,
            String slug,
            String locale,
            int lockVersion,
            int version,
            String versionId,
            String status,
            String title,
            String summary,
            String coverMediaId,
            JsonNode data,
            boolean featured,
            int sortWeight,
            List<ContentRelationDraft> relations,
            Instant createdAt
    ) {}

    public record NavigationItemDraft(
            String id,
            String parentId,
            @NotBlank @Size(max = 160) String label,
            @NotBlank String linkType,
            @NotBlank @Size(max = 1000) String linkValue,
            String target,
            @Min(0) int order,
            boolean visible
    ) {}

    public record SaveNavigationRequest(@Min(0) int lockVersion, @Valid List<NavigationItemDraft> items, @Size(max = 500) String changeNote) {}

    public record NavigationDraft(String id, String key, String name, int lockVersion, int version, List<NavigationItemDraft> items) {}

    public record SaveJsonDraftRequest(@Min(0) int lockVersion, @NotNull JsonNode value, @Size(max = 500) String changeNote) {}

    public record JsonDraft(String id, String key, String name, int lockVersion, int version, JsonNode value) {}
}
