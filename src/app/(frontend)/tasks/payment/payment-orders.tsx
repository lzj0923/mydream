"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Order = { order_no: string; title: string; current_price: number; status: string; environment: string };

export function PaymentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("正在讀取訂單…");
  const [needsLogin, setNeedsLogin] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/payments/orders", { cache: "no-store" });
      if (response.status === 401) { setNeedsLogin(true); setMessage("請登入後查看付款結果"); return; }
      if (!response.ok) throw new Error("讀取失敗");
      const data = await response.json();
      if (!Array.isArray(data.orders)) throw new Error("讀取失敗");
      setOrders(data.orders); setMessage(data.orders.length ? "顯示最近 20 筆訂單" : "尚無購買訂單"); setNeedsLogin(false);
    } catch { setMessage("暫時無法讀取訂單，請稍後重新查詢；請勿重複付款。"); }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => { void refresh(); }, 0);
    let count = 0;
    const timer = window.setInterval(() => { if (++count >= 12) window.clearInterval(timer); void refresh(); }, 5000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);
  return <section><p role="status">{message}</p>{needsLogin ? <Link href="/login?next=%2Ftasks%2Fpayment">登入查看訂單</Link> : <>
    <button type="button" onClick={refresh}>重新查詢</button>
    <ul className="payment-orders">{orders.map(order => <li key={order.order_no}>
      <h2>{order.title} · NT${order.current_price}</h2><p>訂單：{order.order_no}</p>
      <strong>{order.status === "paid" ? "付款成功，已到帳" : "尚未付款或付款確認中"}{order.environment === "test" ? "（測試訂單）" : ""}</strong>
    </li>)}</ul>
  </>}</section>;
}
