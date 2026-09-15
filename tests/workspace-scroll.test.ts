import test from 'node:test';
import assert from 'node:assert/strict';
import { resetWorkspaceScroll } from '../src/lib/navigation/workspace-scroll.ts';

test('workspace navigation resets scroll after the destination renders and cancels stale work', () => {
 let callback: (()=>void) | undefined;
 let position: unknown;
 let cancelled = 0;
 const cleanup = resetWorkspaceScroll({requestAnimationFrame(fn:()=>void){callback=fn;return 8;},cancelAnimationFrame(id:number){cancelled=id;},scrollTo(options:unknown){position=options;}});
 assert.equal(position,undefined);
 callback!();
 assert.deepEqual(position,{top:0,left:0,behavior:'instant'});
 cleanup();
 assert.equal(cancelled,8);
});
