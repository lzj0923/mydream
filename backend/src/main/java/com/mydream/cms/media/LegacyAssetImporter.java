package com.mydream.cms.media;

import com.mydream.cms.config.CmsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(20)
public class LegacyAssetImporter implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(LegacyAssetImporter.class);
    private final MediaService media;
    private final CmsProperties properties;

    public LegacyAssetImporter(MediaService media, CmsProperties properties) {
        this.media = media;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        var imported = media.importLegacyAssets(properties.legacyAssetDirectory(), properties.legacyAssetSiteKey());
        if (imported > 0) log.info("Imported {} legacy static assets into the managed media library", imported);
    }
}
