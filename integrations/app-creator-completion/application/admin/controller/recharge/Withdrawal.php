<?php

namespace app\admin\controller\recharge;

use app\common\controller\Backend;
use think\Db;
use Exception;
use think\exception\PDOException;
use think\exception\ValidateException;
use app\common\service\LogService;

/**
 * 用户提现记录管理
 *
 * @icon fa fa-circle-o
 */
class Withdrawal extends Backend
{

    /**
     * Withdrawal模型对象
     * @var \app\admin\model\recharge\Withdrawal
     */
    protected $model = null;

    public function _initialize()
    {
        parent::_initialize();
        $this->model = new \app\admin\model\recharge\Withdrawal;
        $this->view->assign("statusList", $this->model->getStatusList());
    }



    /**
     * 默认生成的控制器所继承的父类中有index/add/edit/del/multi五个基础方法、destroy/restore/recyclebin三个回收站方法
     * 因此在当前控制器中可不用编写增删改查的代码,除非需要自己控制这部分逻辑
     * 需要将application/admin/library/traits/Backend.php中对应的方法复制到当前控制器,然后进行修改
     */


    /**
     * 查看
     */
    public function index()
    {
        //当前是否为关联查询
        $this->relationSearch = true;
        //设置过滤方法
        $this->request->filter(['strip_tags', 'trim']);
        if ($this->request->isAjax()) {
            //如果发送的来源是Selectpage，则转发到Selectpage
            if ($this->request->request('keyField')) {
                return $this->selectpage();
            }
            list($where, $sort, $order, $offset, $limit) = $this->buildparams();

            $list = $this->model
                ->with(['user'])
                ->where($where)
                ->order($sort, $order)
                ->paginate($limit);

            foreach ($list as $row) {
                $row->visible(['id', 'withdrawal_type', 'amount', 'fee', 'actual_amount', 'withdrawal_method', 'status', 'bank_data', 'reason', 'created_at', 'payment_reference', 'processed_at', 'processed_by', 'creator_request_id', 'user_id']);
                $row->visible(['user']);
                $row->getRelation('user')->visible(['username', 'mobile']);
            }

            $result = array("total" => $list->total(), "rows" => $list->items());

            return json($result);
        }
        return $this->view->fetch();
    }

    public function edit($ids = NULL)
    {
        $row = $this->model->get($ids);
        if (!$row) {
            $this->error(__('No Results were found'));
        }

        if (false === $this->request->isPost()) {
            // 整理为通用格式
            $bank_data = json_decode($row->bank_data, true);

            $formData = [];
            // 遍历解码后的数组，提取字段并构造统一格式
            if (isset($bank_data['name'])) {
                $formData[] = ['label' => '用户名称', 'value' => $bank_data['name']];
            }
            if (isset($bank_data['bank'])) {
                $formData[] = ['label' => '银行名称', 'value' => $bank_data['bank']];
            }
            if (isset($bank_data['card'])) {
                $formData[] = ['label' => '银行卡号', 'value' => $bank_data['card']];
            }
            if (isset($bank_data['phone'])) {
                $formData[] = ['label' => '支付宝号', 'value' => $bank_data['phone']];
            }
            // 将数据传递到模板
            $this->assign('form_data', $formData);
            $this->view->assign('row', $row);
            return $this->view->fetch();
        }
        $params = $this->request->post('row/a');
        if (empty($params)) {
            $this->error(__('Parameter %s can not be empty', ''));
        }

        try {
            \app\common\service\CreatorWithdrawalDecision::decide($ids, $params['status'] ?? '', $params['reason'] ?? '', $params['payment_reference'] ?? '', $this->auth->id);
        } catch (\Throwable $e) {$this->error($e->getMessage());}
        $this->success();
    }

    // All state changes must pass the locked decision service.
    public function add(){ $this->error('提现申请仅由用户提交'); }
    public function del($ids = null){ $this->error('提现记录不可删除'); }
    public function multi($ids = null){ $this->error('请逐笔审核并填写处理凭证'); }
    public function import(){ $this->error('提现记录不支持导入'); }
}
