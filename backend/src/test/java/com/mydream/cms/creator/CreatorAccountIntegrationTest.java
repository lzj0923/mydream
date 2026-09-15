package com.mydream.cms.creator;

import static org.assertj.core.api.Assertions.*;
import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named="CREATOR_AUTH_TEST_DB", matches="jdbc:mysql://127.0.0.1:3309/creator_auth_test(?:\\?.*)?")
class CreatorAccountIntegrationTest {
    JdbcTemplate jdbc; CreatorAccountService service; HttpServer app;
    @BeforeEach void setup() throws Exception {
        var ds=new DriverManagerDataSource(System.getenv("CREATOR_AUTH_TEST_DB"),"root",""); jdbc=new JdbcTemplate(ds);
        jdbc.execute("DROP TABLE IF EXISTS cms_creator_session"); jdbc.execute("DROP TABLE IF EXISTS cms_creator_account");
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/V29__creator_accounts.sql")).execute(ds);
        app=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        app.createContext("/api/user/userInfo",exchange -> {
            assertThat(exchange.getRequestMethod()).isEqualTo("GET");
            assertThat(exchange.getRequestBody().readAllBytes()).isEmpty();
            String token=exchange.getRequestHeaders().getFirst("token");
            String body="valid-app-token".equals(token)?"{\"code\":1,\"data\":{\"userinfo\":{\"id\":452,\"username\":\"App Writer\"}}}":"{\"code\":401}";
            byte[] bytes=body.getBytes(StandardCharsets.UTF_8); exchange.sendResponseHeaders(200,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });app.start();
        var cipher=new PiiCipher(new CmsProperties(null,null,null,null,null,Base64.getEncoder().encodeToString(new byte[32]),null,null,null,null));
        var target=new CreatorAccountService(jdbc,new BCryptPasswordEncoder(4),cipher,new ObjectMapper(),"http://127.0.0.1:"+app.getAddress().getPort());
        var proxy=new ProxyFactory(target);proxy.setProxyTargetClass(true);proxy.addAdvice(new TransactionInterceptor(new DataSourceTransactionManager(ds),new AnnotationTransactionAttributeSource()));service=(CreatorAccountService)proxy.getProxy();
    }
    @AfterEach void stop(){if(app!=null)app.stop(0);}
    CreatorAccountService.Login register(String name){return service.register(name,"Creator12345",null,true);}
    @Test void independentCredentialsHashSessionsAndRevoke() {
        var a=register("Writer_1");assertThat(a.account().username()).isEqualTo("writer_1");
        String hash=jdbc.queryForObject("SELECT password_hash FROM cms_creator_account",String.class);
        assertThat(hash).startsWith("$2").doesNotContain("Creator12345");
        assertThat(jdbc.queryForObject("SELECT token_hash FROM cms_creator_session",String.class)).isEqualTo(CreatorAccountService.hash(a.token())).isNotEqualTo(a.token());
        assertThat(service.viewer(a.token()).ownerKey()).isEqualTo("creator:"+a.account().id());
        assertThat(service.viewer(a.token()).admin()).isFalse();
        assertThatThrownBy(()->register("WRITER_1")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.require("valid-app-token")).isInstanceOf(ApiException.class);
        var second=service.login("WRITER_1","Creator12345");service.logout(a.token());
        assertThatThrownBy(()->service.require(a.token())).isInstanceOf(ApiException.class);assertThat(service.require(second.token()).id()).isEqualTo(a.account().id());
        jdbc.update("UPDATE cms_creator_session SET expires_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 DAY)");
        assertThatThrownBy(()->service.require(second.token())).isInstanceOf(ApiException.class);
    }
    @Test void passwordFailuresLockAndExpireWithoutRollback() {
        register("writer_1");
        for(int i=0;i<8;i++)assertThatThrownBy(()->service.login("writer_1","wrong123")).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.login("writer_1","Creator12345")).hasMessageContaining("15");
        jdbc.update("UPDATE cms_creator_account SET locked_until=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE)");
        assertThatThrownBy(()->service.login("writer_1","wrong123")).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT failed_attempts FROM cms_creator_account",Integer.class)).isEqualTo(1);
        assertThat(service.login("writer_1","Creator12345").token()).startsWith("cr_");
    }
    @Test void bindingRequiresVerifiedAppTokenIsUniqueAndKeepsCreatorOwnership() {
        var a=register("writer_1");var b=register("writer_2");String owner=service.viewer(a.token()).ownerKey();
        assertThatThrownBy(()->service.appSession(a.token())).hasMessageContaining("綁定");
        assertThatThrownBy(()->service.bind(a.token(),"forged-token",3600)).isInstanceOf(ApiException.class);
        assertThat(service.bind(a.token(),"valid-app-token",3600).appUserId()).isEqualTo(452L);
        assertThat(jdbc.queryForObject("SELECT app_token_encrypted FROM cms_creator_account WHERE id=?",String.class,a.account().id())).doesNotContain("valid-app-token");
        assertThat(service.appSession(a.token()).token()).isEqualTo("valid-app-token");
        assertThatThrownBy(()->service.bind(b.token(),"valid-app-token",3600)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.unbind(a.token(),"wrong123")).isInstanceOf(ApiException.class);
        service.unbind(a.token(),"Creator12345");assertThat(service.viewer(a.token()).ownerKey()).isEqualTo(owner);
        assertThatThrownBy(()->service.appSession(a.token())).isInstanceOf(ApiException.class);
        assertThat(service.bind(b.token(),"valid-app-token",3600).appUserId()).isEqualTo(452L);
        jdbc.update("UPDATE cms_creator_account SET app_token_expires_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 DAY) WHERE id=?",b.account().id());
        assertThatThrownBy(()->service.appSession(b.token())).hasMessageContaining("過期");
    }
    @Test void invalidRegistrationDoesNotCreateAccounts() {
        assertThatThrownBy(()->service.register("test","12345678",null,true)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->service.register("test","Creator12345",null,false)).isInstanceOf(ApiException.class);
        assertThatThrownBy(()->register("x")).isInstanceOf(ApiException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_account",Integer.class)).isZero();
    }
    @Test void expiredOrFailedAppLoginNeverErasesBindingAndRefreshPreservesBoundDate(){
        var owner=register("stable_writer");service.bind(owner.token(),"valid-app-token",3600);
        jdbc.update("UPDATE cms_creator_account SET bound_at='2026-01-01 00:00:00',app_token_expires_at='2026-01-01 00:00:00' WHERE id=?",owner.account().id());
        assertThatThrownBy(()->service.appSession(owner.token())).isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code()).isEqualTo("APP_REAUTH_REQUIRED"));
        assertThat(service.require(owner.token()).appUserId()).isEqualTo(452L);
        assertThatThrownBy(()->service.bind(owner.token(),"expired-token",3600)).isInstanceOf(ApiException.class);
        assertThat(service.require(owner.token()).appUserId()).isEqualTo(452L);
        service.bind(owner.token(),"valid-app-token",3600);
        assertThat(jdbc.queryForObject("SELECT DATE_FORMAT(bound_at,'%Y-%m-%d') FROM cms_creator_account WHERE id=?",String.class,owner.account().id())).isEqualTo("2026-01-01");
        assertThat(service.appSession(owner.token()).userId()).isEqualTo(452L);
        app.stop(0);app=null;
        assertThatThrownBy(()->service.bind(owner.token(),"valid-app-token",3600)).isInstanceOf(ApiException.class);
        assertThat(service.require(owner.token()).appUserId()).isEqualTo(452L);
    }
}
