package com.mydream.cms;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ServiceLandingController {
    @GetMapping("/")
    public Map<String, Object> landing() {
        return Map.of(
                "service", "MY DREAM CMS",
                "status", "UP",
                "message", "Java 后端已启动；此端口提供 API，不是可视化后台页面。",
                "frontend", "http://localhost:3000",
                "health", "/actuator/health",
                "login", "/admin-api/v1/auth/login"
        );
    }
}
