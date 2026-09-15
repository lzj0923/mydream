package com.mydream.cms.creator;

import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/creator-api/v1/bank-account")
public class CreatorBankAccountController {
    private final CreatorAccountService accounts;
    private final JdbcTemplate jdbc;
    private final PiiCipher cipher;
    private final ObjectMapper mapper;
    public CreatorBankAccountController(CreatorAccountService accounts, JdbcTemplate jdbc, PiiCipher cipher, ObjectMapper mapper) {
        this.accounts=accounts; this.jdbc=jdbc; this.cipher=cipher; this.mapper=mapper;
    }
    public record Binding(@NotBlank @Size(max=100) String holderName, @NotBlank @Size(max=100) String bankName,
        @Size(max=150) String branch, @NotBlank @Size(max=50) String accountNumber,
        @NotBlank @Size(max=50) String confirmAccountNumber, @NotBlank @Size(max=72) String password) {}
    static String number(String input) {
        String value=input==null?"":input.replace(" ","").replace("-","");
        if(!value.matches("[0-9]{6,34}")) throw ApiException.invalid("請輸入 6–34 位數字銀行賬號");
        return value;
    }
    static String masked(String value) { return "•••• " + value.substring(value.length()-4); }
    @GetMapping Object get(HttpServletRequest request) {
        var owner=accounts.require(CreatorAccountController.token(request));
        return read(owner);
    }
    private Object read(CreatorAccountService.Account owner) {
        var rows=jdbc.queryForList("SELECT payload_encrypted FROM cms_creator_bank_account WHERE account_id=?",String.class,owner.id());
        if(rows.isEmpty()) return Map.of("bound",false,"username",owner.username());
        var payload=mapper.readTree(cipher.decrypt(rows.get(0)));
        return Map.of("bound",true,"username",owner.username(),"holderName",payload.path("holderName").asText(),"bankName",payload.path("bankName").asText(),
            "branch",payload.path("branch").asText(),"maskedAccountNumber",masked(payload.path("accountNumber").asText()),"status","PENDING_VERIFICATION");
    }
    @PostMapping Object bind(@Valid @RequestBody Binding input,HttpServletRequest request) {
        var owner=accounts.require(CreatorAccountController.token(request));
        String accountNumber=number(input.accountNumber());
        if(!accountNumber.equals(number(input.confirmAccountNumber()))) throw ApiException.invalid("兩次輸入的銀行賬號不一致");
        var checked=accounts.login(owner.username(),input.password());
        accounts.logout(checked.token());
        var payload=Map.of("holderName",input.holderName().trim(),"bankName",input.bankName().trim(),"branch",input.branch()==null?"":input.branch().trim(),"accountNumber",accountNumber);
        String encrypted=cipher.encrypt(mapper.writeValueAsString(payload));
        jdbc.update("INSERT INTO cms_creator_bank_account(account_id,payload_encrypted) VALUES (?,?) ON DUPLICATE KEY UPDATE payload_encrypted=VALUES(payload_encrypted),updated_at=CURRENT_TIMESTAMP",owner.id(),encrypted);
        return read(owner);
    }
}
