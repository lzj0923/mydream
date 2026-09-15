<?php
// Isolated MySQL integration harness. No real App account, bank or payment is used.
namespace think {
 class Db {
  static $pdo; static function startTrans(){self::$pdo->beginTransaction();} static function commit(){self::$pdo->commit();} static function rollback(){if(self::$pdo->inTransaction())self::$pdo->rollBack();}
  static function name($name){return new Query('fa_'.$name);}
 }
 class Query {
  private $where=[];private $args=[];private $locked=false;
  function __construct(private $table){} function where($key,$value){$this->where[]="`$key`=?";$this->args[]=$value;return $this;}function lock($yes){$this->locked=$yes;return $this;}
  function find(){ $q=Db::$pdo->prepare('SELECT * FROM '.$this->table.' WHERE '.implode(' AND ',$this->where).($this->locked?' FOR UPDATE':''));$q->execute($this->args);return $q->fetch(\PDO::FETCH_ASSOC); }
  function update($data){$q=Db::$pdo->prepare('UPDATE '.$this->table.' SET '.implode(',',array_map(fn($key)=>"`$key`=?",array_keys($data))).' WHERE '.implode(' AND ',$this->where));$q->execute(array_merge(array_values($data),$this->args));return $q->rowCount();}
  function value($key){$row=$this->find();return $row[$key]??null;}
  function insertGetId($data){$this->insert($data);return (int)Db::$pdo->lastInsertId();}
  function insert($data){$q=Db::$pdo->prepare('INSERT INTO '.$this->table.' (`'.implode('`,`',array_keys($data)).'`) VALUES ('.implode(',',array_fill(0,count($data),'?')).')');$q->execute(array_values($data));}
 }
}
namespace app\common\model {
 class ScoreLog{static $fail=false;static function create($data){if(self::$fail)throw new \RuntimeException('Synthetic ledger failure');\think\Db::name('user_score_log')->insert($data);}}
}
namespace think\exception {class HttpResponseException extends \Exception {}}
namespace app\common\controller {
 class Api {
  protected $auth;protected $request;
  function __construct($fields){$this->auth=(object)['id'=>2];$this->request=new class($fields){function __construct(private $fields){}function param($key,$default=null,$filter=null){return $this->fields[$key]??$default;}function get($key,$default=null){return $this->fields[$key]??$default;}};}
  function success(...$args){throw new \think\exception\HttpResponseException('success');}
  function error($text){throw new \RuntimeException($text);}
 }
}
namespace {
 function __($text){return $text;}
 function config($key,$default=null){return $default;}
 require __DIR__."/../application/api/controller/User.php";
 function request(){return new class{function ip(){return '127.0.0.1';}function header($name){return 'Local integration test';}};}
 require __DIR__.'/../application/common/service/LogService.php';
 require __DIR__.'/../application/common/service/CreatorWithdrawalDecision.php';
 use app\common\service\CreatorWithdrawalDecision as Decision;
 function check($ok,$label){if(!$ok)throw new \RuntimeException($label);}
 function fails($fn){try{$fn();}catch(\Throwable $e){return;}throw new \RuntimeException('Expected rejection');}
 $pdo=new \PDO('mysql:host=127.0.0.1;port=3309;charset=utf8mb4','root','',[\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION]);
 $pdo->exec('CREATE DATABASE IF NOT EXISTS app_creator_completion_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');$pdo->exec('USE app_creator_completion_test');
 check($pdo->query('SELECT DATABASE()')->fetchColumn()==='app_creator_completion_test','Wrong database');
 foreach(['fa_user_withdrawal','fa_creator_operation_audit','fa_short_drama','fa_short_drama_episode','fa_video','fa_user','fa_user_score_log','fa_auth_rule'] as $table)$pdo->exec('DROP TABLE IF EXISTS '.$table);
 foreach(['user_withdrawal','short_drama','short_drama_episode','video','user_score_log','auth_rule'] as $table)$pdo->exec('CREATE TABLE fa_'.$table.' LIKE lc0401_app.fa_'.$table);
 $migration=file_get_contents(__DIR__.'/../001_operations_and_settlement.sql');[$ddl,$triggers]=explode('DELIMITER $$',$migration,2);$pdo->exec($ddl);
 foreach(explode('$$',str_replace('DELIMITER ;','',$triggers)) as $statement)if(trim($statement))$pdo->exec($statement);
 $pdo->exec(file_get_contents(__DIR__.'/../002_earning_references.sql'));
 $pdo->exec('CREATE TABLE fa_user(id INT PRIMARY KEY,score DECIMAL(20,2)) ENGINE=InnoDB');$pdo->exec('INSERT INTO fa_user VALUES(2,0)');\think\Db::$pdo=$pdo;
 foreach([1,2,3] as $id)$pdo->exec("INSERT INTO fa_user_withdrawal(id,user_id,withdrawal_type,amount,actual_amount,withdrawal_method,bank_data) VALUES($id,2,1,100,90,2,'{}')");
 Decision::decide(1,'2','Synthetic rejection','',7);
 fails(fn()=>Decision::decide(1,'2','Repeat','',7));fails(fn()=>Decision::decide(1,'1','','receipt-1',7));
 check((int)$pdo->query('SELECT score FROM fa_user')->fetchColumn()===100,'Exactly one refund');
 fails(fn()=>Decision::decide(2,'1','','',7));Decision::decide(2,'1','Manual payment verified','TEST-RECEIPT-2',7);fails(fn()=>Decision::decide(2,'2','Repeat refund','',7));
 check((int)$pdo->query('SELECT COUNT(*) FROM fa_creator_operation_audit')->fetchColumn()===2,'One audit per decision');
 \app\common\model\ScoreLog::$fail=true;fails(fn()=>Decision::decide(3,'2','Refund failure','',7));check($pdo->query('SELECT status FROM fa_user_withdrawal WHERE id=3')->fetchColumn()==='0','Failure rolls back');
 $pdo->exec("SET @creator_audit_actor='app-admin:7'");$pdo->exec("INSERT INTO fa_short_drama(id,title,status) VALUES(1,'Synthetic drama','published')");$pdo->exec("UPDATE fa_short_drama SET status='inactive' WHERE id=1");$pdo->exec('DELETE FROM fa_short_drama WHERE id=1');
 check((int)$pdo->query("SELECT COUNT(*) FROM fa_creator_operation_audit WHERE entity_type='drama' AND actor='app-admin:7'")->fetchColumn()===3,'Insert/offline/delete audited');
 fails(fn()=>$pdo->exec("DELETE FROM fa_creator_operation_audit"));fails(fn()=>$pdo->exec("UPDATE fa_creator_operation_audit SET actor='forged'"));
 // A ledger insert failure after balance change must also roll back the balance.
 check((int)$pdo->query('SELECT score FROM fa_user')->fetchColumn()===100,'Ledger failure rolls back balance');
 check((int)$pdo->query('SELECT COUNT(*) FROM fa_user_score_log')->fetchColumn()===1,'Only one real refund ledger entry');
 \app\common\model\ScoreLog::$fail=false;
 $pdo->exec("INSERT INTO fa_short_drama_episode(id,drama_id,title,video_url,video_attachment_id) VALUES(90,7,'Synthetic episode','https://example.invalid/video','test')");
 $pdo->beginTransaction();
 $reward=\app\common\service\LogService::recordScoreLog(2,1,5,'创作者分润奖励',\app\common\service\LogService::CONTENT_TYPE_SCORE_SHARING_REWARDS,null,'reward',null,7,0,0,['drama_id'=>7,'episode_id'=>90,'basis'=>'TEST-STATEMENT-1']);
 check($reward['success'],'Referenced reward');$pdo->commit();
 check((int)$pdo->query("SELECT episode_id FROM fa_user_score_log WHERE source_scope='episode'")->fetchColumn()===90,'Work reference stored with actual credit');
 $pdo->exec('UPDATE fa_user SET score=1000 WHERE id=2');
 $fields=['withdrawal_type'=>1,'amount'=>100,'withdrawal_method'=>2,'bank_name'=>'Synthetic','bank_data/a'=>['name'=>'Test','bank'=>'Synthetic','card'=>'000000'],'creator_request_id'=>'11111111-1111-4111-8111-111111111111'];
 $controller=new \app\api\controller\User($fields);
 for($i=0;$i<2;$i++){try{$controller->userWithdrawal();}catch(\think\exception\HttpResponseException $e){}}
 check((int)$pdo->query('SELECT score FROM fa_user')->fetchColumn()===900,'Same App request deducts only once');
 check((int)$pdo->query("SELECT COUNT(*) FROM fa_user_withdrawal WHERE creator_request_id IS NOT NULL")->fetchColumn()===1,'Same request creates only one App withdrawal');
 echo "PASS: isolated MySQL manual payout, required receipt, one-time rejection/refund, terminal-state protection, refund rollback, App publication deletion audit, append-only logs\n";
}
