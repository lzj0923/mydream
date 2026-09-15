package com.mydream.cms.forms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.shared.ApiException;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.Test;

class PiiCipherTest {
    @Test
    void encryptsWithRandomIvAndDecryptsLosslessly() {
        var key = Base64.getEncoder().encodeToString(new byte[32]);
        var cipher = new PiiCipher(properties(key));

        var first = cipher.encrypt("{\"phone\":\"13800000000\"}");
        var second = cipher.encrypt("{\"phone\":\"13800000000\"}");

        assertThat(first).isNotEqualTo(second);
        assertThat(cipher.decrypt(first)).isEqualTo("{\"phone\":\"13800000000\"}");
    }

    @Test
    void rejectsSubmissionEncryptionWhenKeyIsMissing() {
        var cipher = new PiiCipher(properties(""));
        assertThatThrownBy(() -> cipher.encrypt("secret"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("CMS_PII_KEY_BASE64");
    }

    private CmsProperties properties(String key) {
        return new CmsProperties("http://localhost:8080", Path.of("./data/uploads"),
                List.of("http://localhost:3000"), "", "", key, "",
                Path.of("../public"), "mydream", "");
    }
}
