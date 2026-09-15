package com.mydream.cms.studio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;

import com.mydream.cms.audit.AuditLog;
import com.mydream.cms.delivery.AppContentWriter;
import com.mydream.cms.shared.ApiException;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.ObjectProvider;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class StudioFacadeVersioningTest {
    @Test
    void copiedPageBlocksReceiveFreshIdsForEveryVersion() {
        var previousId = "42000000-0000-0000-0000-000000000001";

        var firstCopy = StudioFacade.freshVersionChildId(previousId);
        var secondCopy = StudioFacade.freshVersionChildId(previousId);

        assertThat(firstCopy).isNotEqualTo(previousId);
        assertThat(secondCopy).isNotEqualTo(previousId).isNotEqualTo(firstCopy);
    }

    @Test
    void copiedNavigationItemsAlsoReceiveFreshIds() {
        var previousId = "32000000-0000-0000-0000-000000000001";

        assertThat(StudioFacade.freshVersionChildId(previousId)).isNotEqualTo(previousId);
    }

    @Test
    void duplicateContentSlugReturnsAReadableConflictInsteadOfDatabaseError() {
        var jdbc = mock(JdbcTemplate.class);
        @SuppressWarnings("unchecked")
        var writerProvider = (ObjectProvider<AppContentWriter>) mock(ObjectProvider.class);
        var facade = spy(new StudioFacade(jdbc, mock(ObjectMapper.class), mock(BlockRegistry.class),
                mock(AuditLog.class), writerProvider));
        doReturn(1L).when(facade).siteDbId("site-id");
        doThrow(new DuplicateKeyException("duplicate slug")).when(jdbc)
                .update(anyString(), any(), any(), any(), any(), any());
        var request = new StudioModels.CreateContentRequest(
                "work", "new-work", "zh-Hant", "新作品", "简介", null,
                mock(JsonNode.class), true, 0, List.of(), "新增作品");

        assertThatThrownBy(() -> facade.createContent("site-id", request, null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("唯一标识")
                .hasMessageContaining("new-work");
    }
}
