import { FileCheck2, ShieldCheck } from "lucide-react";

const terms = [
  "MY DREAM 提供 AI 原創短劇觀看、會員服務及虛擬金幣等數位內容服務。",
  "使用者完成付款後，系統將依交易內容提供相應之金幣或會員權益。",
  "因數位商品具即時性及不可回復性，若已完成金幣儲值、會員啟用或使用平台服務，恕不接受退款申請。",
  "若發生付款成功但未收到服務權益、系統異常或其他交易問題，請聯繫客服，我們將協助確認並處理。",
  "購買前請確認商品內容、服務規則及付款資訊，完成付款即表示同意本消費者權益規範。",
];

export function ConsumerRights() {
  return <div className="consumer-rights-readable">
    <div><h2><FileCheck2 aria-hidden />消費者權益說明</h2>
      <ol>{terms.map((term, index) => <li key={term}><span aria-hidden>{index + 1}</span><p>{term}</p></li>)}</ol>
    </div>
    <div className="consumer-rights-readable__shield" aria-hidden><ShieldCheck /></div>
  </div>;
}
