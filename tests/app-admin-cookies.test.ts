import test from 'node:test';
import assert from 'node:assert/strict';
import {applyUpstreamCookies, repairLegacyAuthCookies} from '../src/lib/app-admin/cookies.ts';

test('expired FastAdmin cookies are removed rather than forwarded as deleted', () => {
  const jar = {PHPSESSID:'session',keeplogin:'previous',fastadmin_userinfo:'previous'};
  applyUpstreamCookies(jar, ['keeplogin=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/', 'fastadmin_userinfo=deleted; Max-Age=0; path=/']);
  assert.deepEqual(jar,{PHPSESSID:'session'});
});
test('Max-Age takes precedence and cookie values retain equals signs', () => {
  const jar: Record<string,string> = {};
  applyUpstreamCookies(jar,['token=abc==; Max-Age=100; Expires=Thu, 01 Jan 1970 00:00:00 GMT']);
  assert.equal(jar.token,'abc==');
  applyUpstreamCookies(jar,['token=gone; max-age=-1']);
  assert.deepEqual(jar,{});
});
test('legacy deletion markers heal without discarding valid authentication cookies', () => {
  const jar={keeplogin:'deleted',fastadmin_userinfo:'deleted',PHPSESSID:'keep',other:'deleted'};
  repairLegacyAuthCookies(jar);
  assert.deepEqual(jar,{PHPSESSID:'keep',other:'deleted'});
  const valid={keeplogin:'18|100|9999999999|signature',fastadmin_userinfo:'valid'};
  repairLegacyAuthCookies(valid);
  assert.equal(valid.keeplogin,'18|100|9999999999|signature');
});
