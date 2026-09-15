package com.mydream.cms.forms;

import tools.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.mail.SimpleMailMessage;

final class ContactMailMessageFactory {
    private ContactMailMessageFactory() {}

    static SimpleMailMessage create(String from, String recipient, String submissionId, String sourcePath,
                                    JsonNode payload) {
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setReplyTo(header(text(payload, "email")));
        message.setSubject("[MY DREAM] 新的合作洽询 - " + header(first(payload, "company", "name", "未填写名称")));
        message.setText(String.join("\n", List.of(
                "MY DREAM 官网收到新的合作洽询",
                "",
                "提交编号：" + submissionId,
                "来源页面：" + safe(sourcePath, 500),
                "公司名称：" + text(payload, "company"),
                "联系人：" + text(payload, "name"),
                "联系电话：" + text(payload, "phone"),
                "联系邮箱：" + text(payload, "email"),
                "公司网站：" + text(payload, "website"),
                "合作需求：" + values(payload.path("cooperationNeeds")),
                "获知渠道：" + text(payload, "discoverySource"),
                "补充说明：\n" + text(payload, "message"),
                "",
                "该信息已加密保存至 MY DREAM 后台“表单线索”。"
        )));
        return message;
    }

    private static String first(JsonNode payload, String first, String second, String fallback) {
        var value = text(payload, first);
        return value.isBlank() ? safe(text(payload, second), 120).isBlank() ? fallback : text(payload, second) : value;
    }

    private static String text(JsonNode payload, String field) {
        var value = payload.path(field);
        return value.isValueNode() ? safe(value.asText(), 4000) : "";
    }

    private static String values(JsonNode value) {
        if (!value.isArray()) return value.isValueNode() ? safe(value.asText(), 1000) : "";
        var items = new ArrayList<String>();
        value.forEach(item -> { if (item.isValueNode()) items.add(safe(item.asText(), 120)); });
        return String.join("、", items);
    }

    private static String header(String value) {
        return safe(value, 180).replace('\r', ' ').replace('\n', ' ').trim();
    }

    private static String safe(String value, int maximum) {
        if (value == null) return "";
        var clean = value.strip();
        return clean.length() <= maximum ? clean : clean.substring(0, maximum);
    }
}
