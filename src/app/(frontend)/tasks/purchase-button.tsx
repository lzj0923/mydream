"use client";

import { useRef, useState } from "react";
import { parseCheckout } from "@/lib/payments/checkout";

export function PurchaseButton({ productId, price, title }: { productId: string; price: number; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  async function purchase() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, expectedPrice: price }) });
      if (response.status === 401) { window.location.assign("/login?next=%2Ftasks"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "暫時無法建立付款");
      const checkout = parseCheckout(data);
      if (checkout.environment === "test" && !window.confirm("目前為測試付款，並非正式收款。是否繼續測試？")) return;
      const form = document.createElement("form");
      form.method = "POST"; form.action = checkout.gateway;
      for (const [name, value] of Object.entries(checkout.fields)) {
        const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input);
      }
      document.body.appendChild(form); form.submit();
    } catch (error) { setMessage(error instanceof Error ? error.message : "暫時無法建立付款，請稍後再試"); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <div className="pricing-purchase">
    {confirming ? <div className="pricing-purchase__confirm">
      <p>{title} · NT${price}，單次付款。</p>
      <p>付款成功後將儲值至目前登入的 App 帳號。請確認下方消費者權益說明。</p>
      <button type="button" onClick={purchase} disabled={busy}>{busy ? "正在建立訂單…" : "確認並前往付款"}</button>
      <button type="button" className="pricing-purchase__cancel" disabled={busy} onClick={() => setConfirming(false)}>取消</button>
    </div> : <button type="button" onClick={() => setConfirming(true)}>立即購買</button>}
    {message && <p role="alert">{message}</p>}
  </div>;
}
