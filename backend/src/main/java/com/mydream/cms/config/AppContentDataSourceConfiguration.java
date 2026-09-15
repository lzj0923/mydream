package com.mydream.cms.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@ConditionalOnProperty(prefix = "cms.app-content", name = "enabled", havingValue = "true")
public class AppContentDataSourceConfiguration {
    @Bean(destroyMethod = "close")
    AppContentDatabase appContentDatabase(AppContentProperties properties) {
        if (properties.databaseUrl().isBlank()) {
            throw new IllegalStateException("CMS_APP_DATABASE_URL 未配置");
        }
        var dataSource = DataSourceBuilder.create()
                .url(properties.databaseUrl())
                .username(properties.username())
                .password(properties.password())
                .build();
        return new AppContentDatabase(dataSource, new JdbcTemplate(dataSource));
    }
}
