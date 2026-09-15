package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class CreatorVerificationMaterialsTest {
    Map<String,String> profile(String type) {
        return new HashMap<>(Map.of("displayName","Studio","email","test@example.invalid","phone","+886 912345678","city","Taipei","introduction","Original animation","documentType",type,"representative","Test","address","Test address","contactRole","Producer"));
    }
    CreatorVerificationService.Input input(String entity,Map<String,String> profile,String... kinds) {
        var docs=Arrays.stream(kinds).map(kind->new CreatorVerificationService.Document(kind,"unused",kind)).toList();
        return new CreatorVerificationService.Input("COMIC",entity,"Test","123","Test","test@example.invalid","TW",docs,true,0,profile);
    }
    @Test void acceptsFiveMiBAndRejectsOneByteOverLimit() {
        byte[] bytes=new byte[5*1024*1024];bytes[0]=(byte)255;bytes[1]=(byte)216;bytes[2]=(byte)255;
        var valid=new CreatorVerificationService.Document("test.jpg","data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(bytes));
        assertThatCode(()->CreatorVerificationService.document(valid)).doesNotThrowAnyException();
        var invalid=new CreatorVerificationService.Document("test.jpg","data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(Arrays.copyOf(bytes,bytes.length+1)));
        assertThatThrownBy(()->CreatorVerificationService.document(invalid)).isInstanceOf(ApiException.class);
    }
    @Test void identityCardRequiresSeparateFrontBackAndHandheld() {
        var p=profile("ID_CARD");
        assertThatCode(()->CreatorVerificationService.validateMaterials(input("PERSONAL",p,"ID_FRONT","ID_BACK","HANDHELD"))).doesNotThrowAnyException();
        assertThatThrownBy(()->CreatorVerificationService.validateMaterials(input("PERSONAL",p,"ID_FRONT","ID_BACK"))).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->CreatorVerificationService.validateMaterials(input("PERSONAL",p,"ID_FRONT","ID_BACK","ID_BACK"))).isInstanceOf(ApiException.class);
    }
    @Test void passportRequiresDataPageAndHandheldNotIdentityBack() {
        var p=profile("PASSPORT");
        assertThatCode(()->CreatorVerificationService.validateMaterials(input("PERSONAL",p,"PASSPORT","HANDHELD"))).doesNotThrowAnyException();
        assertThatThrownBy(()->CreatorVerificationService.validateMaterials(input("PERSONAL",p,"PASSPORT","ID_BACK"))).isInstanceOf(ApiException.class);
    }
    @Test void enterpriseNeedsAuthorizationAndResponsiblePerson() {
        var p=profile("BUSINESS_LICENSE");
        assertThatCode(()->CreatorVerificationService.validateMaterials(input("BUSINESS",p,"BUSINESS_LICENSE","AUTHORIZATION"))).doesNotThrowAnyException();
        p.remove("representative");
        assertThatThrownBy(()->CreatorVerificationService.validateMaterials(input("BUSINESS",p,"BUSINESS_LICENSE","AUTHORIZATION"))).isInstanceOf(ApiException.class);
    }
    @Test void invalidContactAndPortfolioAreRejected() {
        var p=profile("PASSPORT");p.put("email","invalid");
        assertThatThrownBy(()->CreatorVerificationService.validateMaterials(input("PERSONAL",p,"PASSPORT","HANDHELD"))).isInstanceOf(ApiException.class);
        p.put("email","test@example.invalid");p.put("portfolioUrl","javascript:alert(1)");
        assertThatThrownBy(()->CreatorVerificationService.validateMaterials(input("PERSONAL",p,"PASSPORT","HANDHELD"))).isInstanceOf(ApiException.class);
    }
}
