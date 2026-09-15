const newHeroFields: Record<string, Record<string, string>> = {
  "/universe": { subtitle: "學習、創造、啟發" },
  "/news": { subtitle: "探索 MY DREAM 最新動態" },
  "/download": { subtitle: "隨時隨地，開啟精彩故事" },
  "/tasks": { description: "選擇金幣單集解鎖，或於會員期間暢享短劇內容。" },
};

// Upgrade older two-level heroes once. Once saved, deliberately cleared copy stays clear.
export function navigationHeroProps(path: string, props: Record<string, unknown>) {
  const defaults = newHeroFields[path];
  if (!defaults || props.navigationCopyVersion === 1) return props;
  const result: Record<string, unknown> = { ...props, navigationCopyVersion: 1 };
  for (const [field, value] of Object.entries(defaults)) {
    if (typeof result[field] !== "string" || !String(result[field]).trim()) result[field] = value;
  }
  return result;
}
