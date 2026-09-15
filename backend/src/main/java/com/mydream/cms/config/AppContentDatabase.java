package com.mydream.cms.config;

import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;

/** Keeps the optional App pool out of Spring Boot's primary DataSource/JdbcTemplate auto-configuration. */
public record AppContentDatabase(DataSource dataSource, JdbcTemplate jdbc) implements AutoCloseable {
    @Override
    public void close() throws Exception {
        if (dataSource instanceof AutoCloseable closeable) closeable.close();
    }
}
