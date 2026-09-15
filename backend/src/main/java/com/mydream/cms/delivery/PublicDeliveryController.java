package com.mydream.cms.delivery;

import java.time.Duration;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public-api/v1/sites/{siteKey}")
public class PublicDeliveryController {
    private final SiteDelivery delivery;

    public PublicDeliveryController(SiteDelivery delivery) {
        this.delivery = delivery;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<DeliveryModels.Bootstrap> bootstrap(@PathVariable String siteKey,
                                                              @RequestParam(defaultValue = "/") String path,
                                                              @RequestParam(required = false) String locale) {
        var value = delivery.bootstrap(siteKey, path, locale);
        return cached(value, value.site().releaseId());
    }

    @GetMapping("/shell")
    public ResponseEntity<DeliveryModels.SiteShell> shell(@PathVariable String siteKey) {
        var value = delivery.shell(siteKey);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Release-Id", value.releaseId())
                .body(value);
    }

    @GetMapping("/pages")
    public ResponseEntity<DeliveryModels.Page> page(@PathVariable String siteKey,
                                                    @RequestParam String path,
                                                    @RequestParam(required = false) String locale) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(delivery.page(siteKey, path, locale));
    }

    @GetMapping("/content/{type}")
    public List<DeliveryModels.Content> content(@PathVariable String siteKey, @PathVariable String type,
                                                @RequestParam(required = false) String locale,
                                                @RequestParam(required = false) String parentSlug,
                                                @RequestParam(defaultValue = "24") int limit,
                                                @RequestParam(defaultValue = "0") int offset) {
        return delivery.content(siteKey, type, locale, parentSlug, limit, offset);
    }

    @GetMapping("/content/{type}/{slug}")
    public DeliveryModels.Content contentItem(@PathVariable String siteKey, @PathVariable String type,
                                              @PathVariable String slug,
                                              @RequestParam(required = false) String locale) {
        return delivery.contentItem(siteKey, type, slug, locale);
    }

    private <T> ResponseEntity<T> cached(T value, String releaseId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .eTag('"' + releaseId + '"')
                .header("X-Release-Id", releaseId)
                .body(value);
    }
}
