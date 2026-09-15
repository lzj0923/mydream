import type { EditableHomeBlock } from "./home-section-settings";

export const backgroundPages = [
  { path: "/login", pageKey: "login-background", title: "登錄背景" },
  { path: "/register", pageKey: "register-background", title: "註冊背景" },
  { path: "/video-player", pageKey: "video-player-background", title: "影片播放背景" },
  { path: "/episode-player", pageKey: "episode-player-background", title: "劇集播放背景" },
];

export function backgroundSettingsPath(path: string) {
  if (path.startsWith("/universe/videos/")) return "/video-player";
  if (path.startsWith("/works/")) return "/episode-player";
  return path;
}

export function defaultBackgroundBlocks(): EditableHomeBlock[] {
  return [{ type: "rich-text", schemaVersion: 1, zone: "page-background", order: 0, visible: true,
    props: { backgroundMediaId: "", backgroundUrl: "", backgroundPosition: "center center" }, style: {} }];
}
