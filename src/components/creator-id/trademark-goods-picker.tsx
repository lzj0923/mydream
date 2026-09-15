"use client";

import { useMemo, useState } from "react";
import { classItems, filterCatalog, findClass, makeGoodsSelection, type CatalogItem, type GoodsSelection } from "@/lib/trademark-catalog";
import styles from "./professional-rights-page.module.css";

export function TrademarkGoodsPicker({ value, onChange }: { value: GoodsSelection[]; onChange: (value: GoodsSelection[]) => void }) {
  const [query, setQuery] = useState("");
  const [currentCode, setCurrentCode] = useState("001");
  const [customText, setCustomText] = useState("");
  const [customError, setCustomError] = useState("");
  const categories = useMemo(() => filterCatalog(query), [query]);
  const current = categories.find((category) => category.code === currentCode) ?? categories[0];
  const selection = current ? value.find((row) => findClass(row.class)?.code === current.code) : undefined;
  const selectedCodes = selection?.selectedCodes ?? [];
  const selected = new Set(selectedCodes);
  const customNames = selection?.customNames ?? (selection?.names && !selection.selectedCodes ? selection.names.split("\n").filter(Boolean) : []);
  const update = (codes: string[], custom = customNames) => {
    if (!current) return;
    const next = makeGoodsSelection(current.code, codes, custom);
    onChange([...value.filter((row) => row.class && findClass(row.class)?.code !== current.code), ...(next.names ? [next] : [])].sort((a, b) => Number(a.class) - Number(b.class)));
  };
  const toggle = (items: CatalogItem[], checked: boolean) => {
    const codes = new Set(selectedCodes);
    items.forEach((item) => checked ? codes.add(item.code) : codes.delete(item.code));
    update([...codes]);
  };
  const itemList = (items: CatalogItem[]) => <div className={styles.goodsItems}>
    <label className={styles.goodsSelectAll}><input type="checkbox" checked={items.length > 0 && items.every((item) => selected.has(item.code))} aria-label="全選此分組" onChange={(e) => toggle(items, e.target.checked)} />全選 <small>已選 {items.filter((item) => selected.has(item.code)).length}／{items.length}</small></label>
    {items.map((item) => <label key={item.code}><input type="checkbox" checked={selected.has(item.code)} onChange={(e) => toggle([item], e.target.checked)} /><span>{item.name}<small>{item.code}</small></span></label>)}
  </div>;
  const chooseClass = (code: string) => { setCurrentCode(code); setCustomText(""); setCustomError(""); };

  return <div className={styles.goodsPicker}>
    <header><div><h4>指定使用商品／服務名稱</h4><p>依類別、組群及下級分組展開，勾選實際使用的商品或服務。</p></div><span>{value.filter((row) => row.names).length} 類已選</span></header>
    <label className={styles.goodsSearch}><span>商品服務名稱／代碼檢索</span><input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setCustomText(""); setCustomError(""); }} placeholder="輸入商品服務名稱、代碼或類別關鍵字" /><small>依官方目錄順序顯示，共 45 類。</small></label>
    <div className={styles.goodsBrowser}>
      <nav aria-label="商品服務類別"><div className={styles.goodsListHeading}>類別 <span>{categories.length}</span></div>{categories.map((category) => <button type="button" aria-pressed={current?.code === category.code} key={category.code} onClick={() => chooseClass(category.code)}><b>{category.code}</b><span>{category.name}</span>{value.find((row) => findClass(row.class)?.code === category.code)?.names ? <small>已選</small> : null}</button>)}</nav>
      <div className={styles.goodsGroups} aria-label="商品服務組群及項目">{current ? <>
        <h4>{current.code} 類 {current.name}</h4>
        <p>{query ? "符合檢索條件的組群／商品" : "請展開組群選擇商品服務名稱"}</p>
        {current.topItems.map((group) => <details className={styles.goodsGroup} key={`${current.code}-${query}-${group.code}`} open={query ? true : undefined}><summary>{group.code} {group.name}<span>{group.middleItems.flatMap((middle) => middle.lowItems).filter((item) => selected.has(item.code)).length} 已選</span></summary>
          {group.middleItems.length === 1 && !group.middleItems[0].code ? itemList(group.middleItems[0].lowItems) : group.middleItems.map((middle) => <details className={styles.goodsSubgroup} key={middle.code} open={query ? true : undefined}><summary>{middle.code} {middle.name}</summary>{itemList(middle.lowItems)}</details>)}
        </details>)}
        <div className={styles.goodsCustom}><label><span>自訂商品服務名稱（{current.code} 類，每行一項）</span><textarea rows={3} maxLength={5000} value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="找不到適合的參考名稱時，可自行填寫" /></label><button type="button" className={styles.addRowButton} onClick={() => { const names = customText.split(/[\n；;]/).map((name) => name.trim()).filter(Boolean); if (!names.length) { setCustomError("請先輸入商品服務名稱。"); return; } update(selectedCodes, [...customNames, ...names]); setCustomText(""); setCustomError(""); }}>加入自訂名稱</button>{customError ? <p role="alert">{customError}</p> : null}</div>
      </> : <p role="status">查無符合的商品服務名稱或代碼，請更換關鍵字。</p>}</div>
    </div>
    <div className={styles.goodsSelected}><h4>已選商品／服務</h4>{!value.some((row) => row.names) ? <p>尚未選擇，請從上方目錄勾選至少一項商品／服務。</p> : value.filter((row) => row.names).map((row) => {
      const category = findClass(row.class)!;
      const official = classItems(category).filter((item) => row.selectedCodes?.includes(item.code));
      const customs = row.customNames ?? (row.selectedCodes ? [] : row.names.split("\n"));
      const removeItem = (code: string | null, name: string) => { const next = makeGoodsSelection(category.code, (row.selectedCodes ?? []).filter((item) => item !== code), customs.filter((item) => item !== name)); onChange(value.flatMap((item) => item === row ? next.names ? [next] : [] : [item])); };
      return <article key={row.class}><header><strong>{category.code} {category.name}</strong><div><button type="button" onClick={() => { setQuery(""); chooseClass(category.code); }}>編輯類別</button><button type="button" onClick={() => onChange(value.filter((item) => item !== row))}>移除此類</button></div></header><div className={styles.goodsTags}>{official.map((item) => <button type="button" key={item.code} aria-label={`移除 ${item.name}`} onClick={() => removeItem(item.code, "")}>{item.name} ×</button>)}{customs.map((name) => <button type="button" key={`custom-${name}`} aria-label={`移除自訂 ${name}`} onClick={() => removeItem(null, name)}>{name}（自訂） ×</button>)}</div></article>;
    })}</div>
    <p className={styles.fieldNotice}>資料來源：智慧財產局商標線上申請系統，目錄同步日期 2026/09/07。自訂名稱與官方參考名稱分開保存。</p>
  </div>;
}
