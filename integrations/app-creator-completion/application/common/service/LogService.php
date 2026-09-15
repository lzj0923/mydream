<?php

namespace app\common\service;

use app\common\model\MoneyLog;
use app\common\model\ScoreLog;
use think\Db;

class LogService
{

    const CONTENT_TYPE_UNLOCK_DRAMA = 'unlock_drama'; //解锁整部短剧
    const CONTENT_TYPE_UNLOCK_EPISODE = 'unlock_episode'; //解锁单集
    const CONTENT_TYPE_SIGNIN = 'signin'; //签到
    const CONTENT_TYPE_RECHARGE = 'recharge';//App充值
    const CONTENT_TYPE_MONEY_RECHARGE_GOOGLE = 'money_recharge_google';//谷歌充值
    const CONTENT_TYPE_MONEY_RECHARGE_APPLE = 'money_recharge_apple';//苹果充值
    const CONTENT_TYPE_MONEY_RECHARGE_GIFT = 'money_recharge_gift';//充值赠送
    const CONTENT_TYPE_MONEY_RECHARGE_PAYPAL = 'money_recharge_paypal';//paypal充值
    const CONTENT_TYPE_MONEY_RECHARGE_SYSTEM = 'money_recharge_system';
    const CONTENT_TYPE_MONEY_RECHARGE_DEC_SYSTEM = 'money_recharge_dec_system';
    const CONTENT_TYPE_SCORE_RECHARGE_SYSTEM = 'score_recharge_system';
    const CONTENT_TYPE_SCORE_RECHARGE_DEC_SYSTEM = 'score_recharge_dec_system';
    const CONTENT_TYPE_SCORE_INVITE = 'score_invite';
    const CONTENT_TYPE_SCORE_WITHDRAWAL = 'score_withdrawal'; //积分提现
    const CONTENT_TYPE_SCORE_REFUND = 'score_refund'; //积分提现拒绝
    const CONTENT_TYPE_MONEY_RECHARGE_STRIPE = 'money_recharge_stripe';//stripe充值
    const CONTENT_TYPE_TASK_REWARD = 'task_reward'; //任务奖励
    const CONTENT_TYPE_SCORE_DISTRIBUTION_DIRECT = 'score_distribution_direct'; //直推分销奖励
    const CONTENT_TYPE_SCORE_DISTRIBUTION_INDIRECT = 'score_distribution_indirect'; //间推分销奖励
    const CONTENT_TYPE_SCORE_SHARING_REWARDS = 'score_profit_sharing_rewards'; //分润奖励



    public static function recordMoneyLog($userId, $type, $money, $memo, $enum, $source, $lang_template, $lang_params = null, $opUserId = null)
    {
        try {
            // 检查金额是否为正数
            $money = abs($money);

            // 查询用户余额并加行锁
            $user = Db::name('user')->where('id', $userId)->lock(true)->find();
            if (!$user) {
                throw new \Exception(__('No results were found'));
            }

            $before = $user['money']; // 当前余额
            if ($type == 2 && $user['money'] < $money) { // 支出且余额不足
                throw new \Exception(__('Insufficient Balance'));
            }

            // 计算变动后的余额
            $after = $type == 1 ? $before + $money : $before - $money;

            // 更新用户余额
            $updateData = ['money' => $after];

            $result = Db::name('user')->where('id', $userId)->update($updateData);
            if (!$result) {
                throw new \Exception(__('Operation failed'));
            }

            // 记录余额变动日志
            $logData = [
                'user_id'    => $userId,
                'type'       => $type,
                'money'      => $money,
                'before'     => $before,
                'after'      => $after,
                'memo'       => $memo,
                'enum'       => $enum,
                'source'     => $source,
                'op_ip'      => request()->ip(),
                'op_user_id' => $opUserId ?? null, // 后台操作时的管理员ID
                'op_device'  => request()->header('User-Agent') ?? 'unknown',
                'created_at' => date('Y-m-d H:i:s'),
                'lang_template' => $lang_template,
                'lang_params' => $lang_params
            ];
            MoneyLog::create($logData);
        } catch (\Exception $e) {
            // 捕获异常，返回错误信息
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
        return [
            'success' => true,
            'message' => __('Operation completed'),
        ];
    }


    /**
     * 记录用户积分变动日志
     *
     * @param int $userId 用户ID
     * @param int $type 类型 1-收入 2-支出
     * @param int $score 变动积分
     * @param int $before 变动前积分
     * @param int $after 变动后积分
     * @param string $memo 备注
     * @return void
     */
    public static function recordScoreLog($userId, $type, $money, $memo, $enum, $source, $lang_template, $lang_params = null, $opUserId = null,$ratio = 0,$points = 0, $workReference = null)
    {
        try {
            $attribution = [];
            if ($workReference !== null) {
                if ($type != 1 || $enum !== self::CONTENT_TYPE_SCORE_SHARING_REWARDS || !is_array($workReference)) throw new \Exception('仅单作品分润入账可指定作品归属');
                $episodeId = (int)($workReference['episode_id'] ?? 0); $dramaId = (int)($workReference['drama_id'] ?? 0);
                $basis = trim((string)($workReference['basis'] ?? ''));
                if ($episodeId < 1 || $dramaId < 1 || $basis === '' || mb_strlen($basis) > 200 || !Db::name('short_drama_episode')->where('id',$episodeId)->where('drama_id',$dramaId)->find()) throw new \Exception('作品归属与结算依据无效');
                $attribution = ['source_scope'=>'episode','drama_id'=>$dramaId,'episode_id'=>$episodeId,'attribution_basis'=>$basis];
            }
            // 检查金额是否为正数
            $money = abs($money);

            // 查询用户余额并加行锁
            $user = Db::name('user')->where('id', $userId)->lock(true)->find();
            if (!$user) {
                throw new \Exception(__('No results were found'));
            }

            $before = $user['score']; // 当前余额
            if ($type == 2 && $user['score'] < $money) { // 支出且余额不足
                throw new \Exception(__('Insufficient Balance'));
            }

            // 计算变动后的余额
            $after = $type == 1 ? $before + $money : $before - $money;

            // 更新用户余额
            $result = Db::name('user')->where('id', $userId)->update(['score' => $after]);
            if (!$result) {
                throw new \Exception(__('Operation failed'));
            }

            // 记录余额变动日志
            $logData = [
                'user_id'    => $userId,
                'type'       => $type,
                'score'      => $money,
                'before'     => $before,
                'after'      => $after,
                'memo'       => $memo,
                'enum'       => $enum,
                'source'     => $source,
                'op_ip'      => request()->ip(),
                'op_user_id' => $opUserId ?? null, // 后台操作时的管理员ID
                'op_device'  => request()->header('User-Agent') ?? 'unknown',
                'created_at' => date('Y-m-d H:i:s'),
                'lang_template' => $lang_template,
                'lang_params' => $lang_params,
                'ratio' => $ratio,
                'points' => $points,
            ];
            ScoreLog::create(array_merge($logData,$attribution));
        } catch (\Exception $e) {
            // 捕获异常，返回错误信息
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
        return [
            'success' => true,
            'message' => __('Operation completed'),
        ];
    }
}
