import test from "node:test";
import assert from "node:assert/strict";
import {assertAppAccess,AppAccessError} from "../src/lib/app-auth/access-error.ts";
import {videoAccessNotice} from "../src/lib/creator-video/access-state.ts";
test("expired App session retains binding and asks only to update login",()=>{
 assert.throws(()=>assertAppAccess(401),e=>e instanceof AppAccessError&&e.code==="APP_REAUTH_REQUIRED"&&e.status===409);
 assert.equal(videoAccessNotice("APP_REAUTH_REQUIRED").action,"更新 App 登錄狀態");
 assert.throws(()=>assertAppAccess(undefined,401),AppAccessError);
});
test("permission failures do not offer binding and transient codes do not impersonate expiry",()=>{
 assert.throws(()=>assertAppAccess(403),e=>e instanceof AppAccessError&&e.code==="APP_PERMISSION_DENIED");
 assert.equal(videoAccessNotice("APP_PERMISSION_DENIED").href,"");
 assert.doesNotThrow(()=>assertAppAccess(0,503));
 assert.doesNotThrow(()=>assertAppAccess(1));
 assert.equal(videoAccessNotice("APP_CONNECTION_UNAVAILABLE").href,"");
});
