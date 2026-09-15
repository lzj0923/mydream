<?php
namespace think {class Db{static function startTrans(){} static function commit(){} static function rollback(){}}}
namespace app\common\service {class LogService{const CONTENT_TYPE_SCORE_REFUND=1;static $refunds=0; static function recordScoreLog(...$args){self::$refunds++;return ['success'=>true];}}}
namespace app\common\controller {
 class Success extends \Error{}
 class Backend{protected $auth;protected $request;function success(){throw new Success;}function error($text){throw new \RuntimeException($text);}}
}
namespace {
 $source=getenv('APP_SOURCE');if(!$source)throw new \RuntimeException('APP_SOURCE required');
 require $source.'/application/admin/controller/recharge/Withdrawal.php';
 class FixtureRow extends \ArrayObject{function save($params){foreach($params as $k=>$v)$this[$k]=$v;return true;}}
 class FixtureController extends \app\admin\controller\recharge\Withdrawal{
 function __construct(){ $row=new FixtureRow(['id'=>1,'user_id'=>2,'withdrawal_type'=>1,'amount'=>100,'status'=>0]);$this->model=new class($row){function __construct(public $row){}function get($id){return $this->row;}};$this->auth=(object)['id'=>7];$this->request=new class{function isPost(){return true;}function post($key){return ['status'=>2,'reason'=>'test'];}}; }
 }
 $c=new FixtureController;for($i=0;$i<2;$i++){try{$c->edit(1);}catch(\app\common\controller\Success $e){}}
 if(\app\common\service\LogService::$refunds!==2)throw new \RuntimeException('Expected legacy duplicate refund reproduction');
 echo "REPRODUCED: repeated rejection creates two refunds for one withdrawal\n";
}
