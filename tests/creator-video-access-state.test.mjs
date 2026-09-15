import test from 'node:test';
import assert from 'node:assert/strict';
import {videoAccessNotice,videoConnectionFailure} from '../src/lib/creator-video/access-state.ts';
test('network failure and unknown errors never request binding',()=>{for(const code of ['',videoConnectionFailure.code,'VIDEO_UNAVAILABLE']){assert.equal(videoAccessNotice(code).action,'');assert.doesNotMatch(videoAccessNotice(code).title,/綁定/);}assert.equal(videoConnectionFailure.status,503);});
test('only explicit missing binding requests binding',()=>{assert.equal(videoAccessNotice('APP_BINDING_REQUIRED').action,'綁定 App 賬號');});
test('expired session preserves binding identity',()=>{assert.match(videoAccessNotice('APP_REAUTH_REQUIRED').title,/已綁定/);assert.equal(videoAccessNotice('APP_REAUTH_REQUIRED').action,'更新 App 登錄狀態');});
