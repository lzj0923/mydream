import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { normalizeAppVideoContent } from "@/content/cms/app-video-content";
import type { CmsContent } from "@/content/cms/java-cms-client";
import { managedOriginalVideoList } from "@/features/jyg/managed-universe";
import { formatVideoDuration } from "@/lib/creator-video/duration";
import { MAX_VIDEO_BYTES, coverMime, safeMediaUrl, videoList, videoMetadata } from "@/lib/creator-video/domain";
import { createUploadRecord, ownedUpload, lockUpload, saveUpload } from "@/lib/creator-video/store";

const meta = { title: "测试视频", description: "作品介绍", filename: "story.mp4", size: 1024 };
test("video durations show actual seconds and never label missing metadata as zero", () => {
  for (const value of [0, -1, null, undefined, NaN, Infinity, "invalid"]) assert.equal(formatVideoDuration(value), null);
  assert.equal(formatVideoDuration(0.3), "00:01");
  assert.equal(formatVideoDuration(8.45), "00:08");
  assert.equal(formatVideoDuration(65), "01:05");
  assert.equal(formatVideoDuration(3661), "1:01:01");
});
test("new App uploads have distinct working card and detail identifiers without website fields", () => {
  const raw = { type: "original-video", title: "小猫历险记", locale: "zh-Hant", coverUrl: "https://assets.example/cover.jpg", data: { source: "app", appId: 1532, href: null, videoUrl: "https://assets.example/video.mp4" } } as unknown as CmsContent;
  const first = normalizeAppVideoContent(raw);
  const second = normalizeAppVideoContent({ ...raw, data: { ...raw.data, appId: 1533 } });
  assert.equal(first.slug, "app-video-1532");
  assert.equal(first.data.href, "/universe/videos/app-video-1532");
  assert.notEqual(first.id, second.id);
  assert.equal(managedOriginalVideoList([first, second]).find(v => v.slug === first.slug)?.videoSrc, raw.data.videoUrl);
  const existing = { ...raw, id: "existing-id", slug: "custom-video", data: { ...raw.data, href: "/universe/videos/custom-video" } };
  assert.deepEqual(normalizeAppVideoContent(existing), existing);
  assert.equal(normalizeAppVideoContent({ ...raw, data: { ...raw.data, appId: 0 } }).slug, undefined);
  assert.equal(normalizeAppVideoContent({ ...raw, type: "tutorial" }).slug, undefined);
});
test("video uploads validate metadata before issuing cloud credentials", () => {
  assert.deepEqual(videoMetadata(meta), meta);
  for (const input of [{...meta,title:""},{...meta,size:0},{...meta,size:MAX_VIDEO_BYTES+1},{...meta,filename:"../story.mp4"},{...meta,filename:"script.html"},{...meta,title:"x".repeat(129)}]) assert.throws(() => videoMetadata(input));
});
test("video list uses playable URLs and never exposes the entire App response", () => {
  const items = videoList([{id:1,title:"作品",cover_image:"/uploads/cover.jpg",video_file:"/vod/id",token:"private",user_email:"private",status:"normal",view_count:10}], "https://assets.example.com");
  assert.equal(items[0].coverUrl,"https://assets.example.com/uploads/cover.jpg");
  assert.equal(items[0].videoUrl,"");
  assert.equal("token" in items[0],false);
  assert.equal("user_email" in items[0],false);
  assert.equal(safeMediaUrl("javascript:alert(1)","https://assets.example.com"),"");
  assert.equal(videoList({data:[]},"https://assets.example.com").length,0);
  assert.throws(()=>videoList(null,"https://assets.example.com"));
});
test("cover content must have a supported image signature", () => {
  assert.equal(coverMime(new Uint8Array([255,216,255,0])),"image/jpeg");
  assert.equal(coverMime(new Uint8Array([137,80,78,71,13,10,26,10])),"image/png");
  assert.equal(coverMime(new TextEncoder().encode("<svg onload=alert(1)>")),null);
});
test("upload records enforce ownership and serialize publication across requests", async () => {
  const directory=await mkdtemp(path.join(tmpdir(),"mydream-video-test-"));
  const before=process.env.CREATOR_VIDEO_STATE_DIR;
  process.env.CREATOR_VIDEO_STATE_DIR=directory;
  try {
    const entry=await createUploadRecord({...meta,ownerId:12,videoId:"1234567890abcdef",attachmentId:"89"});
    assert.equal((await ownedUpload(entry.id,12)).attachmentId,"89");
    await assert.rejects(ownedUpload(entry.id,13),/無權/);
    await assert.rejects(ownedUpload("../../outside",12));
    const unlock=await lockUpload(entry.id);
    await assert.rejects(lockUpload(entry.id));
    entry.state="published";await saveUpload(entry);
    assert.equal((await ownedUpload(entry.id,12)).state,"published");
    await unlock();
    const again=await lockUpload(entry.id);await again();
  } finally {
    if(before===undefined)delete process.env.CREATOR_VIDEO_STATE_DIR;else process.env.CREATOR_VIDEO_STATE_DIR=before;
    assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));
    await rm(directory,{recursive:true});
  }
});
