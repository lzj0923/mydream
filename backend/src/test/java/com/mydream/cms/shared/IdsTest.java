package com.mydream.cms.shared;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class IdsTest {
    @Test
    void createsDatabaseCompatiblePublicIds() {
        var id = Ids.next();
        assertThat(UUID.fromString(id).toString()).isEqualTo(id);
        assertThat(id).hasSize(36);
    }
}
