package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import tools.jackson.databind.ObjectMapper;
class CreatorBankAccountTest {
    @Test void validatesAndMasksAccountNumbers() {
        assertThat(CreatorBankAccountController.number("1234 5678-9012")).isEqualTo("123456789012");
        assertThat(CreatorBankAccountController.masked("123456789012")).isEqualTo("•••• 9012");
        for(String value:List.of("123","ABC12345","123456\n")) assertThatThrownBy(()->CreatorBankAccountController.number(value)).isInstanceOf(ApiException.class);
    }
    @Test void storesEncryptedForSessionOwnerAndReturnsOnlyMaskedNumber() {
        var accounts=mock(CreatorAccountService.class);var jdbc=mock(JdbcTemplate.class);
        var owner=new CreatorAccountService.Account("owner-a","writer", "Writer",null,null,null);
        when(accounts.require("session-a")).thenReturn(owner);
        when(accounts.login("writer","password123")).thenReturn(new CreatorAccountService.Login("temporary",60,owner));
        var cipher=new PiiCipher(new CmsProperties(null,null,null,null,null,Base64.getEncoder().encodeToString(new byte[32]),null,null,null,null));
        var stored=new HashMap<String,String>();
        when(jdbc.update(anyString(),eq("owner-a"),anyString())).thenAnswer(call->{stored.put("owner-a",call.getArgument(2));return 1;});
        when(jdbc.queryForList(anyString(),eq(String.class),eq("owner-a"))).thenAnswer(call->stored.containsKey("owner-a")?List.of(stored.get("owner-a")):List.of());
        var controller=new CreatorBankAccountController(accounts,jdbc,cipher,new ObjectMapper());
        var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer session-a");
        assertThat(controller.get(request)).isEqualTo(Map.of("bound",false,"username","writer"));
        var payload=new CreatorBankAccountController.Binding("Test Holder","Test Bank","Branch","123456789012","123456789012","password123");
        String result=controller.bind(payload,request).toString();
        assertThat(result).contains("9012","PENDING_VERIFICATION","username=writer").doesNotContain("123456789012","password123");
        assertThat(stored.get("owner-a")).doesNotContain("Test Holder","123456789012");
        assertThat(cipher.decrypt(stored.get("owner-a"))).contains("123456789012").doesNotContain("password123");
        verify(accounts).logout("temporary");
        when(accounts.require("session-b")).thenReturn(new CreatorAccountService.Account("owner-b","other","Other",null,null,null));
        when(jdbc.queryForList(anyString(),eq(String.class),eq("owner-b"))).thenReturn(List.of());
        var other=new MockHttpServletRequest();other.addHeader("Authorization","Bearer session-b");
        assertThat(controller.get(other)).isEqualTo(Map.of("bound",false,"username","other"));
        when(accounts.login("writer","incorrect")).thenThrow(ApiException.invalid("密碼錯誤"));
        assertThatThrownBy(()->controller.bind(new CreatorBankAccountController.Binding("Name","Bank","","123456789012","123456789012","incorrect"),request)).isInstanceOf(ApiException.class);
        verify(jdbc,times(1)).update(anyString(),eq("owner-a"),anyString());
    }
}
