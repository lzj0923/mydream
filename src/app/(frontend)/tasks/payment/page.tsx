import Link from "next/link";
import { PaymentOrders } from "./payment-orders";
import "../pricing-readable.css";

export default function PaymentPage() {
  return <main className="payment-result"><h1>付款與訂單</h1><p>請以此處的到帳狀態為準。如已扣款但仍顯示確認中，請勿重複購買。</p><PaymentOrders /><nav><Link href="/account">查看金幣與會員</Link><Link href="/tasks">返回價目表</Link></nav></main>;
}
