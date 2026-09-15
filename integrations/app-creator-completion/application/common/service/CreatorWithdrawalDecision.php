<?php
namespace app\common\service;
use think\Db;

/** Only records a verified manual payment; never sends money. */
class CreatorWithdrawalDecision
{
    public static function decide($id, $status, $reason, $reference, $actor)
    {
        if (!ctype_digit((string)$id) || (int)$id < 1 || !in_array((string)$status, ['1', '2'], true) || (int)$actor < 1) {
            throw new \InvalidArgumentException('请选择已付款或驳回，并使用管理员账号操作');
        }
        $reason = trim((string)$reason); $reference = trim((string)$reference);
        if (mb_strlen($reason) > 300 || strlen($reference) > 200) throw new \InvalidArgumentException('说明或付款凭证编号过长');
        if ((string)$status === '2' && $reason === '') throw new \InvalidArgumentException('请填写驳回原因');
        if ((string)$status === '1' && $reference === '') throw new \InvalidArgumentException('请先完成人工付款，并填写银行回单或付款流水编号');
        Db::startTrans();
        try {
            $row = Db::name('user_withdrawal')->where('id', $id)->lock(true)->find();
            if (!$row) throw new \RuntimeException('提现申请不存在');
            if ((int)$row['status'] !== 0) throw new \RuntimeException('本申请已处理，不能重复付款、驳回或修改结果');
            if ((string)$status === '2') {
                if ((int)$row['withdrawal_type'] !== 1) throw new \RuntimeException('此提现类型需使用对应退款流程，不能按积分退款');
                $refund = LogService::recordScoreLog($row['user_id'], 1, $row['amount'], '积分提现驳回', LogService::CONTENT_TYPE_SCORE_REFUND, $row['id'], 'Withdrawal of points rejected', null, $actor);
                if (empty($refund['success'])) throw new \RuntimeException($refund['message'] ?? '退款失败');
            }
            $changes = ['status'=>(string)$status, 'reason'=>$reason, 'payment_reference'=>$reference, 'processed_by'=>(int)$actor, 'processed_at'=>time()];
            if (Db::name('user_withdrawal')->where('id',$id)->where('status','0')->update($changes) !== 1) throw new \RuntimeException('申请状态已变化，请刷新');
            // No bank account, password or access token is written to the audit trail.
            Db::name('creator_operation_audit')->insert(['entity_type'=>'withdrawal','entity_id'=>(string)$id,'action'=>(string)$status==='1'?'MANUAL_PAID':'REJECT_REFUND','actor'=>'app-admin:'.(int)$actor,'before_json'=>json_encode(['status'=>0,'amount'=>$row['amount']]),'after_json'=>json_encode($changes,JSON_UNESCAPED_UNICODE),'created_at'=>time()]);
            Db::commit();
            return $changes;
        } catch (\Throwable $e) {Db::rollback(); throw $e;}
    }
}
