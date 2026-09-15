<?php
namespace app\admin\controller\creator;
use app\common\controller\Backend;
use think\Db;
/** Read-only audit endpoint. Uses the existing App admin ACL. */
class Audit extends Backend
{
 public function index(){
  $offset=max(0,min(200000,(int)$this->request->get('offset',0)));
  $limit=max(1,min(100,(int)$this->request->get('limit',20)));
  $entity=(string)$this->request->get('entity','');$id=(string)$this->request->get('entity_id','');
  if($entity!==''&&!in_array($entity,['drama','episode','withdrawal','video','earning'],true))$this->error('记录类型无效');
  $query=Db::name('creator_operation_audit');
  if($entity!=='')$query->where('entity_type',$entity);
  if($id!=='')$query->where('entity_id',substr($id,0,64));
  $count=clone $query;
  return json(['total'=>$count->count(),'rows'=>$query->order('id','desc')->limit($offset,$limit)->select()]);
 }
 public function add(){$this->error('操作记录不可手工新增');}
 public function edit($ids=null){$this->error('操作记录不可修改');}
 public function del($ids=null){$this->error('操作记录不可删除');}
 public function multi($ids=null){$this->error('操作记录不可修改');}
 public function import(){$this->error('操作记录不可导入');}
}
