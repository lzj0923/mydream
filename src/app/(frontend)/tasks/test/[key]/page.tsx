import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { callAppApi } from '@/lib/app-auth/upstream';
import { PurchaseButton } from '../../purchase-button';
import '../../pricing-readable.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '專屬付款測試', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function TestPaymentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f0-9]{64}$/.test(key)) notFound();
  let products: Record<string, { title: string; price: number }> = {};
  try {
    const response = await callAppApi('/api/newebpay/testchannel', { body: { testKey: key } });
    if (Number(response.code) === 1) products = (response.data as { products: typeof products }).products;
  } catch { /* Invalid or closed links never expose a purchasable test offer. */ }
  if (!Object.keys(products).length) notFound();
  return <main className="payment-result">
    <h1>專屬付款測試</h1>
    <p>每次實際付款 NT$1。付款成功後，所選金幣或會員權益將發放至下單時登入的帳號。</p>
    <p>無需安裝 App。此連結僅供測試，請勿公開分享。</p>
    <ul className="payment-orders">{Object.entries(products).map(([id, product]) => <li key={id}>
      <h2>{product.title} · NT$1</h2>
      <PurchaseButton productId={id} price={1} title={product.title} testKey={key} />
    </li>)}</ul>
    <nav><Link href="/tasks/payment">查看付款與訂單</Link><Link href="/account">查看我的帳號</Link></nav>
  </main>;
}
