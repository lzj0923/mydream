package com.mydream.cms.studio;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mydream.cms.shared.ApiException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class BlockRegistryTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void fixedHomeVisualFieldsAreAccepted() throws Exception {
        var style = mapper.readTree("""
                {
                  "titleColor":"#f4c542",
                  "descriptionColor":"#cad6e7",
                  "eyebrowColor":"#ffffff",
                  "backgroundColor":"#060b16",
                  "titleFontSize":56,
                  "copyWidth":620,
                  "align":"left",
                  "verticalAlign":"top",
                  "minHeight":620,
                  "paddingTop":64,
                  "paddingBottom":82
                }
                """);

        assertThatCode(() -> BlockRegistry.validateStyle(style)).doesNotThrowAnyException();
    }

    @Test
    void unknownStyleFieldsRemainRejected() throws Exception {
        var style = mapper.readTree("{\"unsafeStyle\":\"value\"}");

        assertThatThrownBy(() -> BlockRegistry.validateStyle(style))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("不允许的样式字段: unsafeStyle");
    }
}
