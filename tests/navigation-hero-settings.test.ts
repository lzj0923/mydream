import test from "node:test";
import assert from "node:assert/strict";
import {resolveHeroSettings,heroCssVariables} from "../src/content/cms/navigation-hero-settings.ts";
test("missing configuration keeps readable shared defaults",()=>{const s=resolveHeroSettings(null);assert.equal(s.top,110);assert.equal(s.titleSize,56);assert.equal(s.mobileTitleSize,38);});
test("saved settings reach CSS while invalid data cannot inject styles",()=>{const css=heroCssVariables({titleSize:62,top:96,titleColor:"#aabbcc",bodyColor:"red;display:none",width:9999,mobileTitleSize:-1,font:"evil"});assert.equal(css["--nav-titleSize"],"62px");assert.equal(css["--nav-top"],"96px");assert.equal(css["--nav-titleColor"],"#aabbcc");assert.equal(css["--nav-bodyColor"],"#c5d1e0");assert.equal(css["--nav-width"],"960px");assert.equal(css["--nav-mobileTitleSize"],"24px");assert.ok(!css["--nav-heading-font"].includes("evil"));});
