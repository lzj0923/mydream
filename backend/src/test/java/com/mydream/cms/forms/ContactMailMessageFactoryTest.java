package com.mydream.cms.forms;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class ContactMailMessageFactoryTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void buildsPlainTextNotificationAndStripsHeaderInjection() throws Exception {
        var payload = mapper.readTree("""
                {"company":"未来娱乐\\r\\nBcc: attacker@example.com","name":"张三","phone":"13800000000",
                 "email":"visitor@example.com","website":"https://example.com",
                 "cooperationNeeds":["IP授权","品牌合作"],"discoverySource":"Google搜索","message":"希望洽谈合作"}
                """);

        var message = ContactMailMessageFactory.create("system@mydream.com", "contact@mydream.com",
                "submission-1", "/contact", payload);

        assertThat(message.getTo()).containsExactly("contact@mydream.com");
        assertThat(message.getReplyTo()).isEqualTo("visitor@example.com");
        assertThat(message.getSubject()).doesNotContain("\r", "\n").contains("未来娱乐");
        assertThat(message.getText()).contains("IP授权、品牌合作").contains("希望洽谈合作");
    }
}
