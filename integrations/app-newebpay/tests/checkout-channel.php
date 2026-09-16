<?php
namespace think {
    class Db { static $order; static function name($name) { return new class { function insert($order) { Db::$order=$order; } }; } }
}
namespace app\common\controller {
    class Api {
        protected $request; protected $auth;
        function __construct($input,$userId) {
            $this->auth=(object)['id'=>$userId];
            $this->request=new class($input) {
                private $input; function __construct($input){$this->input=$input;}
                function isPost(){return true;}
                function post($key,$default=''){return $this->input[explode('/',$key)[0]]??$default;}
            };
        }
        function error($message){throw new \RuntimeException($message);}
        function success($message,$data){throw new \CheckoutSuccess($data);}
    }
}
namespace {
    class CheckoutSuccess extends \Exception { public $data; function __construct($data){$this->data=$data;} }
    function config($name){return $GLOBALS['c'];}
    require __DIR__.'/../application/common/service/NewebpayProtocol.php';
    require __DIR__.'/../application/api/controller/Newebpay.php';
    $key=str_repeat('a',64);
    $c=['enabled'=>true,'environment'=>'production','merchant_id'=>'MS12345678','hash_key'=>str_repeat('K',32),'hash_iv'=>str_repeat('I',16),'site_url'=>'https://shop.example','notify_url'=>'https://app.example/api/newebpay/notify','test_channel_hash'=>hash('sha256',$key)];
    function checkout($input,$user=11) {
        \think\Db::$order=null;
        try {(new \app\api\controller\Newebpay($input,$user))->checkout();}
        catch(CheckoutSuccess $s){return $s->data;}
        throw new \Exception('Missing checkout');
    }
    function check($v){if(!$v)throw new \Exception('Assertion failed');}
    function rejects($input){try{checkout($input);}catch(\RuntimeException $e){check(\think\Db::$order===null);return;}throw new \Exception('Expected rejection');}
    checkout(['productId'=>'coins-500','expectedPrice'=>'100']);check(\think\Db::$order['current_price']===100);
    rejects(['productId'=>'coins-500','expectedPrice'=>'1']);
    rejects(['productId'=>'coins-500','expectedPrice'=>'1','testKey'=>str_repeat('b',64)]);
    foreach(['coins-500','vip-7','vip-365'] as $product){
        $form=checkout(['productId'=>$product,'expectedPrice'=>'1','testKey'=>$key,'user_id'=>999],27);
        check(\think\Db::$order['current_price']===1 && \think\Db::$order['user_id']===27);
        check(\think\Db::$order['product_id']==='test-'.$product);
        parse_str(openssl_decrypt(hex2bin($form['fields']['TradeInfo']),'AES-256-CBC',$c['hash_key'],OPENSSL_RAW_DATA,$c['hash_iv']),$payload);
        check($payload['Amt']==='1');
    }
    $c['test_channel_hash']='';rejects(['productId'=>'coins-500','expectedPrice'=>'1','testKey'=>$key]);
    echo "PASS: normal pricing protected, invalid/disabled links denied, NT1 encrypted amount, current logged-in user owns order\n";
}
