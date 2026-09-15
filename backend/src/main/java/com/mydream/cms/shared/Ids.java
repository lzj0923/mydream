package com.mydream.cms.shared;

import java.util.UUID;

public final class Ids {
    private Ids() {}

    public static String next() {
        return UUID.randomUUID().toString();
    }
}
