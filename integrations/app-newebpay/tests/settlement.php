<?php
// Real MySQL transactions with a small ThinkPHP query adapter. Uses only a fresh, synthetic database.
namespace think {
 class Db {
  static $pdo;
  static function startTrans(){self::$pdo->beginTransaction();} static function commit(){self::$pdo->commit();}
  static function rollback(){if(self::$pdo->inTransaction())self::$pdo->rollBack();}
  static function name($name){return new Query('fa_'.$name);}
 }
 class Query {
  private $where=[];private $args=[];private $locked=false;private $table;
  function __construct($table){$this->table=$table;}
  function where($key,$value){$this->where[]="`$key`=?";$this->args[]=$value;return $this;}
  function lock($yes){$this->locked=$yes;return $this;}
  function find(){$q=Db::$pdo->prepare('SELECT * FROM '.$this->table.' WHERE '.implode(' AND ',$this->where).($this->locked?' FOR UPDATE':''));$q->execute($this->args);return $q->fetch(\PDO::FETCH_ASSOC);}
  function value($key){$row=$this->find();return $row[$key]??null;}
  function update($data){$q=Db::$pdo->prepare('UPDATE '.$this->table.' SET '.implode(',',array_map(function($k){return "`$k`=?";},array_keys($data))).' WHERE '.implode(' AND ',$this->where));$q->execute(array_merge(array_values($data),$this->args));return $q->rowCount();}
  function insert($data){$q=Db::$pdo->prepare('INSERT INTO '.$this->table.' (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');$q->execute(array_values($data));return $q->rowCount();}
 }
 class Log {static function info($m){}static function write($m,$level){}static function error($m){}}
}
namespace app\common\model {
 class User {static function where($key,$value){return \think\Db::name('user')->where($key,$value);}}
 class MoneyLog {
  static $fail=false;
  static function create($data){if(self::$fail)throw new \RuntimeException('Synthetic ledger failure');return \think\Db::name('user_money_log')->insert($data);}
 }
}
namespace {
 function __($text){return $text;}
 function config($key){return $GLOBALS['paymentConfig'];}
 function response($text,$code){return ['code'=>$code,'text'=>$text];}
 function request(){return new class {function ip(){return '127.0.0.1';}function header($name){return 'test';}};}
 require __DIR__.'/../../app-creator-completion/application/common/service/LogService.php';
 require __DIR__.'/../../app-creator-completion/application/common/controller/Api.php';
 require __DIR__.'/../application/common/service/NewebpayProtocol.php';
 require __DIR__.'/../application/api/controller/Newebpay.php';
 class PaymentFixture extends \app\api\controller\Newebpay {
  function __construct($post){$this->request=new class($post){private $data;function __construct($data){$this->data=$data;}function isPost(){return true;}function post(){return $this->data;}};}
 }
 function check($value,$label){if(!$value)throw new \RuntimeException($label);}
 $paymentConfig=['enabled'=>true,'environment'=>'test','merchant_id'=>'MS12345678','hash_key'=>str_repeat('K',32),'hash_iv'=>str_repeat('I',16),'site_url'=>'https://shop.example','notify_url'=>'https://app.example/api/newebpay/notify'];
 $pdo=new \PDO('mysql:host=127.0.0.1;port=3309;charset=utf8mb4','root','',[\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION]);
 $db='newebpay_test_'.bin2hex(random_bytes(6));
 check((bool)preg_match('/^newebpay_test_[a-f0-9]{12}$/D',$db),'Test database name');
 $pdo->exec('CREATE DATABASE `'.$db.'` CHARACTER SET utf8mb4');$pdo->exec('USE `'.$db.'`');\think\Db::$pdo=$pdo;
 try {
  $pdo->exec(file_get_contents(__DIR__.'/../001_newebpay_orders.sql'));
  $pdo->exec('CREATE TABLE fa_user (id INT PRIMARY KEY,money DECIMAL(20,2) NOT NULL DEFAULT 0,vip_endtime BIGINT NOT NULL DEFAULT 0,group_id INT DEFAULT 1) ENGINE=InnoDB');
  $pdo->exec('CREATE TABLE fa_user_vip_log (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT,action VARCHAR(30),description VARCHAR(100),old_endtime BIGINT,new_endtime BIGINT) ENGINE=InnoDB');
  $pdo->exec('CREATE TABLE fa_user_money_log (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT,type INT,money DECIMAL(20,2),`before` DECIMAL(20,2),`after` DECIMAL(20,2),memo TEXT,enum VARCHAR(100),source BIGINT,op_ip VARCHAR(100),op_user_id INT NULL,op_device VARCHAR(100),created_at DATETIME,lang_template TEXT,lang_params TEXT) ENGINE=InnoDB');
  $pdo->exec('INSERT INTO fa_user (id) VALUES (1)');
  function order($number,$type='gold',$amount=500){global $paymentConfig;
   $o=['order_no'=>'MD'.str_pad((string)$number,28,'0',STR_PAD_LEFT),'user_id'=>1,'product_id'=>'synthetic','title'=>'Synthetic','current_price'=>100,'recharge_type'=>$type,'amount'=>$amount,'merchant_id'=>$paymentConfig['merchant_id'],'environment'=>'test','created_at'=>time()];
   \think\Db::name('newebpay_order')->insert($o);return $o;
  }
  function notify($o,$trade,$status='SUCCESS',$amount=100){global $paymentConfig;
   $r=['MerchantID'=>$paymentConfig['merchant_id'],'MerchantOrderNo'=>$o['order_no'],'Amt'=>$amount,'TradeNo'=>$trade,'PaymentType'=>'CREDIT','RespondCode'=>'00'];
   $info=bin2hex(openssl_encrypt(json_encode(['Status'=>$status,'Result'=>$r]),'AES-256-CBC',$paymentConfig['hash_key'],OPENSSL_RAW_DATA,$paymentConfig['hash_iv']));
   return (new PaymentFixture(['MerchantID'=>$paymentConfig['merchant_id'],'TradeInfo'=>$info,'TradeSha'=>\app\common\service\NewebpayProtocol::sha($info,$paymentConfig)]))->notify()['code'];
  }
  $one=order(1);check(notify($one,'10001')===200,'Paid notification');check(notify($one,'10001')===200,'Duplicate acknowledgment');
  check((int)$pdo->query('SELECT money FROM fa_user WHERE id=1')->fetchColumn()===500,'Exactly once coins');
  check((int)$pdo->query('SELECT COUNT(*) FROM fa_user_money_log')->fetchColumn()===1,'Exactly once ledger');
  check(notify($one,'99999')===400,'Conflicting trade rejected');
  $two=order(2);check(notify($two,'10002','SUCCESS',99)===400,'Amount mismatch');check(notify($two,'10002','FAILED')===200,'Failure acknowledgment');
  check($pdo->query('SELECT status FROM fa_newebpay_order WHERE id=2')->fetchColumn()==='pending','Not fulfilled on failure');
  \app\common\model\MoneyLog::$fail=true;check(notify($two,'10002')===503,'Ledger failure retry');
  check((int)$pdo->query('SELECT money FROM fa_user WHERE id=1')->fetchColumn()===500,'Balance rollback');
  check($pdo->query('SELECT status FROM fa_newebpay_order WHERE id=2')->fetchColumn()==='pending','Order rollback');
  \app\common\model\MoneyLog::$fail=false;check(notify($two,'10002')===200,'Retry fulfills');
  $three=order(3);check(notify($three,'10002')===503,'Duplicate gateway trade unique constraint');
  check((int)$pdo->query('SELECT money FROM fa_user WHERE id=1')->fetchColumn()===1000,'Duplicate trade rolls back balance');
  $future=time()+86400*10;$pdo->exec('UPDATE fa_user SET vip_endtime='.$future.' WHERE id=1');
  $vip=order(4,'vip',7);check(notify($vip,'10004')===200,'Membership grant');check(notify($vip,'10004')===200,'Duplicate membership callback');
  check((int)$pdo->query('SELECT vip_endtime FROM fa_user WHERE id=1')->fetchColumn()===$future+86400*7,'Membership extends existing expiry exactly once');
  check((int)$pdo->query('SELECT COUNT(*) FROM fa_user_vip_log')->fetchColumn()===1,'One membership ledger');
  echo "PASS: real MySQL duplicate notifications, amount rejection, ledger rollback/retry, unique trade rollback, membership extension\n";
 } finally {
  check($pdo->query('SELECT DATABASE()')->fetchColumn()===$db,'Cleanup stays inside synthetic test database');
  $pdo->exec('DROP DATABASE `'.$db.'`');
 }
}
