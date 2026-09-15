import { record } from "@/lib/creator-video/domain";

export type SettlementTab = "points" | "withdrawals";
export type SettlementRow = { id: string; createdAt: string; amount: string | null; description: string; status: string; actualAmount: string | null; method: string; reason: string; paymentReference?:string; processedAt?:string };
export type SettlementData = { userId: number; balance: string | null; tab: SettlementTab; page: number; total: number; hasMore: boolean; items: SettlementRow[] };
export function decimalValue(value: unknown): string | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).trim();
  return /^-?\d+(?:\.\d+)?$/.test(text) ? text : null;
}
const text = (value: unknown, max = 200) => typeof value === "string" || typeof value === "number" ? String(value).slice(0, max) : "";
export function settlementPage(value: unknown, tab: SettlementTab, userId: number) {
  const data = record(value);
  if (!Array.isArray(data.data) || data.total == null || !Number.isSafeInteger(Number(data.total)) || Number(data.total) < 0) throw new Error("賬目列表返回異常，請稍後重試");
  const items = data.data.map((value): SettlementRow => {
    const row = record(value);
    if (Number(row.user_id) !== userId) throw new Error("賬目歸屬校驗失敗");
    const withdrawal = tab === "withdrawals";
    return {
      id: text(row.id, 32), createdAt: text(row.created_at, 40),
      amount: decimalValue(withdrawal ? row.amount : row.score),
      actualAmount: withdrawal ? decimalValue(row.actual_amount) : null,
      description: withdrawal ? ({ "1": "積分提現", "2": "新劇收益積分", "3": "版權收益積分", "4": "老劇認購積分", "5": "老劇收益積分" }[String(row.withdrawal_type)] ?? "提現申請") : text(row.description || row.memo),
      status: withdrawal ? ({ "0": "待處理", "1": "已打款", "2": "已拒絕" }[String(row.status)] ?? "狀態未知") : ({ "1": "收入", "2": "支出" }[String(row.type)] ?? "變動"),
      method: withdrawal ? ({ "1": "支付寶", "2": "銀行卡" }[String(row.withdrawal_method)] ?? "—") : "",
      reason: withdrawal ? text(row.reason) : "",
      paymentReference:withdrawal?text(row.payment_reference):"",processedAt:withdrawal?text(row.processed_at):"",
    };
  });
  return { items, total: Number(data.total) };
}
