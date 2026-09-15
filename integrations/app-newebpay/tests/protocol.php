<?php
require __DIR__.'/../application/common/service/NewebpayProtocol.php';
use app\common\service\NewebpayProtocol as P;
function check($value) { if (!$value) throw new Exception('Assertion failed'); }
function rejects($fn) { try {$fn();} catch (Throwable $e) {return;} throw new Exception('Expected rejection'); }
$c = ['enabled'=>true,'environment'=>'test','merchant_id'=>'MS12345678','hash_key'=>str_repeat('K',32),'hash_iv'=>str_repeat('I',16),'site_url'=>'https://shop.example','notify_url'=>'https://app.example/api/newebpay/notify'];
$o = ['order_no'=>'MD'.str_repeat('a',28),'current_price'=>100,'title'=>'500 金幣','merchant_id'=>$c['merchant_id'],'environment'=>'test'];
$form = P::checkout($o,$c);
parse_str(openssl_decrypt(hex2bin($form['fields']['TradeInfo']),'AES-256-CBC',$c['hash_key'],OPENSSL_RAW_DATA,$c['hash_iv']),$request);
check($request['Amt'] === '100' && $request['Version'] === '2.3' && $request['NotifyURL'] === $c['notify_url']);
check($request['RespondType'] === 'JSON' && $request['CREDIT'] === '1');
check($form['gateway'] === 'https://ccore.newebpay.com/MPG/mpg_gateway');
$r = ['MerchantID'=>$c['merchant_id'],'MerchantOrderNo'=>$o['order_no'],'Amt'=>100,'TradeNo'=>'260915123456789','PaymentType'=>'CREDIT','RespondCode'=>'00'];
function signed($data,$c) { $info=bin2hex(openssl_encrypt(json_encode($data),'AES-256-CBC',$c['hash_key'],OPENSSL_RAW_DATA,$c['hash_iv']));return ['MerchantID'=>$c['merchant_id'],'TradeInfo'=>$info,'TradeSha'=>P::sha($info,$c)]; }
$post = signed(['Status'=>'SUCCESS','Result'=>$r],$c);
check(P::decode($post,$c)['result'] === $r); P::assertPaidOrder($o,$r,$c);
$tampered=$post;$tampered['TradeInfo'][0]=$tampered['TradeInfo'][0]==='a'?'b':'a'; rejects(function()use($tampered,$c){P::decode($tampered,$c);});
$tampered=$post;$tampered['MerchantID']='OTHER'; rejects(function()use($tampered,$c){P::decode($tampered,$c);});
foreach (['Amt'=>99,'TradeNo'=>'','RespondCode'=>'05','PaymentType'=>'VACC','MerchantOrderNo'=>'other'] as $key=>$value) {
 $invalid=$r;$invalid[$key]=$value;rejects(function()use($o,$invalid,$c){P::assertPaidOrder($o,$invalid,$c);});
}
$disabled=$c;$disabled['enabled']=false;rejects(function()use($o,$disabled){P::checkout($o,$disabled);});
$invalid=$c;$invalid['environment']='live';rejects(function()use($o,$invalid){P::checkout($o,$invalid);});
check(count(P::products())===8);
echo "PASS: checkout encryption, signature tampering, merchant/amount/order/method checks, disabled configuration\n";
