package com.mydream.cms.creator;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.mydream.cms.delivery.SiteDelivery;
import com.mydream.cms.shared.ApiException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class CreatorServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final CreatorService service = new CreatorService(jdbc, mock(SiteDelivery.class));
    private final CreatorAccess.Viewer alice = new CreatorAccess.Viewer("app:12", "Alice", false);

    @Test void detailCannotReadAnotherOwnersScript() {
        when(jdbc.queryForList(anyString(), eq("other-script"), eq("app:12"))).thenReturn(List.of());
        assertThatThrownBy(() -> service.detail(alice, "other-script")).isInstanceOf(ApiException.class).hasMessage("剧本不存在");
        verify(jdbc).queryForList(contains("WHERE id=? AND owner_key=?"), eq("other-script"), eq("app:12"));
    }
    @Test void submissionRejectsIncompleteManuscript() {
        assertThatThrownBy(() -> CreatorService.validateSubmission("太短", "正文".repeat(100))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> CreatorService.validateSubmission("故事梗概".repeat(10), "太短")).isInstanceOf(ApiException.class);
        assertThatCode(() -> CreatorService.validateSubmission("故事梗概".repeat(10), "角色对白".repeat(30))).doesNotThrowAnyException();
    }
    @Test void staleEditsOrSubmittedManuscriptsCannotBeOverwritten() {
        when(jdbc.queryForList(anyString(),eq("draft-id"),eq("app:12"))).thenReturn(List.of(java.util.Map.of("id","draft-id")));
        var input = new CreatorService.ScriptInput("测试", "悬疑", "短剧", 30, "梗概", "正文", 2);
        assertThatThrownBy(() -> service.update(alice, "draft-id", input)).isInstanceOf(ApiException.class);
        verify(jdbc).update(contains("AND status IN ('DRAFT','CHANGES_REQUESTED')"), eq("测试"), eq("悬疑"), eq("短剧"), eq(30), eq("梗概"), eq("正文"), eq("draft-id"), eq("app:12"), eq(2));
    }
    @Test void modificationRequestRequiresFeedbackAndKnownDecision() {
        assertThatThrownBy(() -> service.review(alice, "id", new CreatorService.ReviewInput("CHANGES_REQUESTED", "", 0))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.review(alice, "id", new CreatorService.ReviewInput("PUBLISHED", "ok", 0))).isInstanceOf(ApiException.class);
        verifyNoInteractions(jdbc);
    }
    @Test void withdrawalCannotChangeReviewedOrStaleSubmission() {
        when(jdbc.queryForList(anyString(),eq("id"),eq("app:12"))).thenReturn(List.of(java.util.Map.of("id","id")));
        assertThatThrownBy(() -> service.withdraw(alice, "id", 3)).isInstanceOf(ApiException.class);
        verify(jdbc).update(contains("AND lock_version=? AND status='SUBMITTED'"), eq("id"), eq("app:12"), eq(3));
    }
}
