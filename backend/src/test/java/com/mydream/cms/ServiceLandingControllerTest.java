package com.mydream.cms;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ServiceLandingControllerTest {
    @Test
    void rootExplainsThatTheBackendIsAnApiInsteadOfReturningAnAuthenticationError() {
        var landing = new ServiceLandingController().landing();

        assertThat(landing).containsEntry("status", "UP");
        assertThat(landing).containsEntry("frontend", "http://localhost:3000");
        assertThat(landing.get("message").toString()).contains("API").contains("不是可视化后台页面");
    }
}
