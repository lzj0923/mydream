"use client";

import type { ReactNode } from "react";
import { type ApplicationDetails, type ApplicationField, detailFields, repeatFields, emptyRow } from "@/lib/trademark-application";
import styles from "./professional-rights-page.module.css";

function Fields({ fields, values, onChange }: { fields: ApplicationField[]; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  return <div className={styles.detailGrid}>{fields.map((field) => <label key={field.key}><span>{field.label}{field.required ? " *" : ""}</span>{field.options ? <select value={values[field.key] ?? ""} required={field.required} onChange={(e) => onChange(field.key, e.target.value)}><option value="">請選擇</option>{field.options.map((v) => <option key={v} value={v}>{v}</option>)}</select> : field.type === "textarea" ? <textarea rows={3} maxLength={5000} required={field.required} value={values[field.key] ?? ""} onChange={(e) => onChange(field.key, e.target.value)} /> : <input type={field.type ?? "text"} maxLength={300} required={field.required} value={values[field.key] ?? ""} onChange={(e) => onChange(field.key, e.target.value)} />}</label>)}</div>;
}

export function DetailFields({ section, value, onChange }: { section: string; value: ApplicationDetails; onChange: (value: ApplicationDetails) => void }) {
  return <Fields fields={detailFields[section]} values={value.fields} onChange={(key, text) => onChange({ ...value, fields: { ...value.fields, [key]: text } })} />;
}

export function RepeatedFields({ group, title, value, onChange, renderAttachments }: { group: Exclude<keyof ApplicationDetails, "fields" | "goods">; title: string; value: ApplicationDetails; onChange: (value: ApplicationDetails) => void; renderAttachments?: (row: Record<string, string>, index: number) => ReactNode }) {
  const rows = value[group];
  const limit = group === "priorities" || group === "exhibitions" ? 5 : 45;
  return <div className={styles.repeatGroup}><h4>{title}</h4>{group === "exhibitions" ? <div className={styles.claimChoices}><label><input type="radio" name="exhibitionClaim" checked={!rows.length} onChange={() => onChange({ ...value, exhibitions: [] })} /><strong>不主張</strong><span>未曾於政府認可之國際展覽會公開展示之案件者</span></label><label><input type="radio" name="exhibitionClaim" checked={!!rows.length} onChange={() => { if (!rows.length) onChange({ ...value, exhibitions: [emptyRow(group)] }); }} /><strong>主張</strong><span>此案件曾經在六個月內政府認可之國際展覽會展出</span></label></div> : null}{rows.map((row, index) => <div className={styles.repeatRow} key={row.attachmentId ?? index}><header><strong>{title} {index + 1}</strong><button type="button" onClick={() => onChange({ ...value, [group]: rows.filter((_, i) => i !== index) })} disabled={group === "priorities" && rows.length === 1}>移除</button></header><Fields fields={repeatFields[group]} values={row} onChange={(key, text) => onChange({ ...value, [group]: rows.map((item, i) => i === index ? { ...item, [key]: text } : item) })} />{renderAttachments?.(row, index)}</div>)}{group !== "exhibitions" || rows.length ? <button className={styles.addRowButton} type="button" disabled={rows.length >= limit} onClick={() => onChange({ ...value, [group]: [...rows, emptyRow(group)] })}>＋ 新增{title}</button> : null}</div>;
}
