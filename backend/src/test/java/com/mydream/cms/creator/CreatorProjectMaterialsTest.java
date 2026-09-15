package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import com.mydream.cms.shared.ApiException;
class CreatorProjectMaterialsTest {
    @Test void updateStatusFollowsPublicationProgressAndCannotBeSubmitted() {
        assertThat(CreatorProjectMaterialsController.updateStatus(12,0)).isEqualTo("未上架");
        assertThat(CreatorProjectMaterialsController.updateStatus(12,1)).isEqualTo("連載中");
        assertThat(CreatorProjectMaterialsController.updateStatus(12,11)).isEqualTo("連載中");
        assertThat(CreatorProjectMaterialsController.updateStatus(12,12)).isEqualTo("已完結");
        assertThat(CreatorProjectMaterialsController.updateStatus(0,0)).isEqualTo("未上架");
        assertThatThrownBy(()->CreatorProjectMaterialsController.validate(new CreatorProjectMaterialsController.Input(Map.of("updateStatus","已完結"),List.of(),0))).isInstanceOf(ApiException.class);
    }
    @Test void acceptsWhitelistedFieldsAndRealFileHeaders() {
        var data="data:application/pdf;base64,"+Base64.getEncoder().encodeToString("%PDF-1.4\nfixture".getBytes());
        assertThatCode(()->CreatorProjectMaterialsController.validate(new CreatorProjectMaterialsController.Input(Map.of("company","Studio"),List.of(new CreatorProjectMaterialsController.Document("rights","rights.pdf",data)),0))).doesNotThrowAnyException();
    }
    @Test void rejectsUnknownFieldsFakeFilesAndPdfCovers() {
        assertThatThrownBy(()->CreatorProjectMaterialsController.validate(new CreatorProjectMaterialsController.Input(Map.of("ownerKey","other"),List.of(),0))).isInstanceOf(ApiException.class);
        for(String data:List.of("data:image/png;base64,aGVsbG8=","data:text/html;base64,PHNjcmlwdD4="))assertThatThrownBy(()->CreatorProjectMaterialsController.validate(new CreatorProjectMaterialsController.Input(Map.of(),List.of(new CreatorProjectMaterialsController.Document("rights","bad.png",data)),0))).isInstanceOf(ApiException.class);
        var pdf="data:application/pdf;base64,"+Base64.getEncoder().encodeToString("%PDF-1.4".getBytes());
        assertThatThrownBy(()->CreatorProjectMaterialsController.validate(new CreatorProjectMaterialsController.Input(Map.of(),List.of(new CreatorProjectMaterialsController.Document("portraitCover","cover.pdf",pdf)),0))).isInstanceOf(ApiException.class);
    }
}
