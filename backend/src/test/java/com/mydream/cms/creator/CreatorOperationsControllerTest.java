package com.mydream.cms.creator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.mydream.cms.shared.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
class CreatorOperationsControllerTest {
 @Test void creatorCannotReadGlobalAuditEvenWithAValidCreatorSession(){
  var access=mock(CreatorAccess.class);var jdbc=mock(JdbcTemplate.class);var request=new MockHttpServletRequest();
  when(access.require(request,null)).thenReturn(new CreatorAccess.Viewer("creator:member","Member",false));
  assertThatThrownBy(()->new CreatorOperationsController(access,jdbc).list(request,null)).isInstanceOf(ApiException.class);
  verifyNoInteractions(jdbc);
 }
}
