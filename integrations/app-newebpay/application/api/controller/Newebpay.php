<?php
namespace app\api\controller;

use app\common\controller\Api;
use app\common\service\NewebpayProtocol as Protocol;
use think\Db;

class Newebpay extends Api
{
    protected $noNeedLogin = ['notify', 'testchannel'];
    protected $noNeedRight = '*';

    protected function _initialize()
    {
        // The shared base exposes public business helpers; never allow them as HTTP actions.
        if (!in_array(strtolower($this->request->action()), ['checkout', 'orders', 'notify', 'testchannel'], true)) {
            throw new \think\exception\HttpResponseException(response('Not found', 404));
        }
        parent::_initialize();
    }

    public function checkout()
    {
        if (!$this->request->isPost()) $this->error('請使用 POST');
        $c = config('newebpay');
        try { Protocol::validateConfig($c); }
        catch (\Throwable $e) { $this->error('付款服務尚未開通，請稍後再試'); }
        $productId = $this->request->post('productId/s', '');
        $products = Protocol::products();
        if (!isset($products[$productId])) $this->error('方案不存在');
        $p = $products[$productId];
        $testKey = $this->request->post('testKey/s', '');
        if ($testKey !== '') {
            if (!Protocol::testChannelAllowed($testKey, $c)) $this->error('測試通道不存在或已關閉');
            $p['price'] = 1;
            $p['title'] = '測試 '.$p['title'];
            $productId = 'test-'.$productId;
        }
        // Browser price is only a stale-price guard; the charged price always comes from this catalog.
        if ((string)$this->request->post('expectedPrice/s', '') !== (string)$p['price']) $this->error('方案價格已更新，請重新整理頁面');
        $order = ['order_no'=>'MD'.bin2hex(random_bytes(14)), 'user_id'=>$this->auth->id,
            'product_id'=>$productId, 'title'=>$p['title'], 'current_price'=>$p['price'],
            'recharge_type'=>$p['type'], 'amount'=>$p['amount'], 'merchant_id'=>$c['merchant_id'],
            'environment'=>$c['environment'], 'status'=>'pending', 'created_at'=>time()];
        try {
            $checkout = Protocol::checkout($order, $c);
            Db::name('newebpay_order')->insert($order);
        } catch (\Throwable $e) { $this->error('無法建立訂單，請稍後再試'); }
        $this->success('', $checkout);
    }

    public function orders()
    {
        $rows = Db::name('newebpay_order')->where('user_id', $this->auth->id)
            ->field('order_no,product_id,title,current_price,status,environment,created_at,paid_at')->order('id desc')->limit(20)->select();
        $this->success('', ['orders'=>$rows]);
    }

    public function testchannel()
    {
        if (!$this->request->isPost()) $this->error('請使用 POST');
        if (!Protocol::testChannelAllowed($this->request->post('testKey/s', ''), config('newebpay'))) {
            $this->error('測試通道不存在或已關閉');
        }
        $products = Protocol::products();
        foreach ($products as &$product) $product['price'] = 1;
        unset($product);
        $this->success('', ['products'=>$products]);
    }

    public function notify()
    {
        if (!$this->request->isPost()) return response('Method not allowed',405);
        try {
            $c = config('newebpay');
            $event = Protocol::decode($this->request->post(),$c);
            // Only verified paid notifications grant benefits. Failed attempts leave the order unpaid.
            if ($event['status'] !== 'SUCCESS') return response('OK',200);
            $r = $event['result'];
            Db::startTrans();
            try {
                $order = Db::name('newebpay_order')->where('order_no',$r['MerchantOrderNo'])->lock(true)->find();
                if (!$order) throw new \InvalidArgumentException('Unknown order');
                Protocol::assertPaidOrder($order,$r,$c);
                if ($order['status'] === 'paid') {
                    if ($order['trade_no'] !== (string)$r['TradeNo']) throw new \InvalidArgumentException('Conflicting transaction');
                } else {
                    $user = Db::name('user')->where('id',$order['user_id'])->lock(true)->find();
                    if (!$user) throw new \RuntimeException('Missing account');
                    // Reuse App entitlement and ledger business logic inside the same transaction.
                    $order['bonus_gold'] = 0;
                    $this->pay_success($order,'newebpay');
                    Db::name('newebpay_order')->where('id',$order['id'])->update([
                        'status'=>'paid', 'trade_no'=>(string)$r['TradeNo'], 'paid_at'=>time()]);
                }
                Db::commit();
            } catch (\Throwable $e) { Db::rollback(); throw $e; }
            return response('OK',200);
        } catch (\InvalidArgumentException $e) { return response('Invalid notification',400); }
        catch (\Throwable $e) {
            // Non-200 causes NewebPay retry; never log encrypted customer/card payloads or keys.
            \think\Log::error('NewebPay notification processing failed');
            return response('Retry later',503);
        }
    }
}
