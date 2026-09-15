<?php

namespace app\common\controller;

use app\common\library\Auth;
use app\common\model\User;
use think\Config;
use think\exception\HttpResponseException;
use think\exception\ValidateException;
use think\Hook;
use think\Lang;
use think\Loader;
use think\Request;
use think\Response;
use think\Route;
use think\Validate;
use app\common\service\LogService;
use think\Db;

/**
 * API控制器基类
 */
class Api
{

    /**
     * @var Request Request 实例
     */
    protected $request;

    /**
     * @var bool 验证失败是否抛出异常
     */
    protected $failException = false;

    /**
     * @var bool 是否批量验证
     */
    protected $batchValidate = false;

    /**
     * @var array 前置操作方法列表
     */
    protected $beforeActionList = [];

    /**
     * 无需登录的方法,同时也就不需要鉴权了
     * @var array
     */
    protected $noNeedLogin = [];

    /**
     * 无需鉴权的方法,但需要登录
     * @var array
     */
    protected $noNeedRight = [];

    /**
     * 权限Auth
     * @var Auth
     */
    protected $auth = null;

    /**
     * 默认响应输出类型,支持json/xml
     * @var string
     */
    protected $responseType = 'json';

    /**
     * 构造方法
     * @access public
     * @param Request $request Request 对象
     */
    public function __construct(Request $request = null)
    {
        $this->request = is_null($request) ? Request::instance() : $request;

        // 控制器初始化
        $this->_initialize();

        // 前置操作方法
        if ($this->beforeActionList) {
            foreach ($this->beforeActionList as $method => $options) {
                is_numeric($method) ?
                    $this->beforeAction($options) :
                    $this->beforeAction($method, $options);
            }
        }
    }

    /**
     * 初始化操作
     * @access protected
     */
    protected function _initialize()
    {
        \think\Db::execute("SET @creator_audit_actor = NULL");
        //跨域请求检测
        check_cors_request();

        // 检测IP是否允许
        check_ip_allowed();

        //移除HTML标签
        $this->request->filter('trim,strip_tags,htmlspecialchars');

        $this->auth = Auth::instance();

        $modulename = $this->request->module();
        $controllername = Loader::parseName($this->request->controller());
        $actionname = strtolower($this->request->action());

        // token
        $token = $this->request->server('HTTP_TOKEN', $this->request->request('token', \think\Cookie::get('token')));

        $path = str_replace('.', '/', $controllername) . '/' . $actionname;
        // 设置当前请求的URI
        $this->auth->setRequestUri($path);
        // 检测是否需要验证登录
        if (!$this->auth->match($this->noNeedLogin)) {
            //初始化
            $this->auth->init($token);
            //检测是否登录
            if (!$this->auth->isLogin()) {
                $this->error(__('Please login first'), null, 401);
            }
            // 判断是否需要验证权限
            if (!$this->auth->match($this->noNeedRight)) {
                // 判断控制器和方法判断是否有对应权限
                if (!$this->auth->check($path)) {
                    $this->error(__('You have no permission'), null, 403);
                }
            }
        } else {
            // 如果有传递token才验证是否登录状态
            if ($token) {
                if(!$this->auth->init($token)){
                    $this->error(__('Please login first'), null, 401);
                }
            }
        }

        \think\Db::execute("SET @creator_audit_actor = ?", [$this->auth->isLogin() ? "app-user:".(int)$this->auth->id : null]);
        $upload = \app\common\model\Config::upload();

        // 上传信息配置后
        Hook::listen("upload_config_init", $upload);

        Config::set('upload', array_merge(Config::get('upload'), $upload));

        // 加载当前控制器语言包
        $this->loadlang($controllername);
    }

    /**
     * 加载语言文件
     * @param string $name
     */
    protected function loadlang($name)
    {
        $name = Loader::parseName($name);
        $name = preg_match("/^([a-zA-Z0-9_\.\/]+)\$/i", $name) ? $name : 'index';
        $lang = $this->request->langset();
        $lang = preg_match("/^([a-zA-Z\-_]{2,10})\$/i", $lang) ? $lang : 'zh-cn';
        Lang::load(APP_PATH . $this->request->module() . '/lang/' . $lang . '/' . str_replace('.', '/', $name) . '.php');
    }

    /**
     * 操作成功返回的数据
     * @param string $msg    提示信息
     * @param mixed  $data   要返回的数据
     * @param int    $code   错误码，默认为1
     * @param string $type   输出类型
     * @param array  $header 发送的 Header 信息
     */
    protected function success($msg = '', $data = null, $code = 1, $type = null, array $header = [])
    {
        $this->result($msg, $data, $code, $type, $header);
    }

    /**
     * 操作失败返回的数据
     * @param string $msg    提示信息
     * @param mixed  $data   要返回的数据
     * @param int    $code   错误码，默认为0
     * @param string $type   输出类型
     * @param array  $header 发送的 Header 信息
     */
    protected function error($msg = '', $data = null, $code = 0, $type = null, array $header = [])
    {
        $this->result($msg, $data, $code, $type, $header);
    }

    /**
     * 返回封装后的 API 数据到客户端
     * @access protected
     * @param mixed  $msg    提示信息
     * @param mixed  $data   要返回的数据
     * @param int    $code   错误码，默认为0
     * @param string $type   输出类型，支持json/xml/jsonp
     * @param array  $header 发送的 Header 信息
     * @return void
     * @throws HttpResponseException
     */
    protected function result($msg, $data = null, $code = 0, $type = null, array $header = [])
    {
        $result = [
            'code' => $code,
            'msg'  => $msg,
            'time' => Request::instance()->server('REQUEST_TIME'),
            'data' => $data,
        ];
        // 如果未设置类型则使用默认类型判断
        $type = $type ?: $this->responseType;

        if (isset($header['statuscode'])) {
            $code = $header['statuscode'];
            unset($header['statuscode']);
        } else {
            //未设置状态码,根据code值判断
            $code = $code >= 1000 || $code < 200 ? 200 : $code;
        }
        $response = Response::create($result, $type, $code)->header($header);
        throw new HttpResponseException($response);
    }
    protected function resultNew($msg, $data = null, $code = 0, $type = null, array $header = [])
    {
        $result = [
            'code' => $code,
            'msg'  => $msg,
            'time' => Request::instance()->server('REQUEST_TIME'),
            'data' => $data,
        ];
        // 如果未设置类型则使用默认类型判断
        $type = $type ?: $this->responseType;

        if (isset($header['statuscode'])) {
            $code = $header['statuscode'];
            unset($header['statuscode']);
        } else {
            //未设置状态码,根据code值判断
            $code = $code >= 1000 || $code < 200 ? 200 : $code;
        }
        return Response::create($result, $type, $code)->header($header);
    }

    /**
     * 前置操作
     * @access protected
     * @param string $method  前置操作方法名
     * @param array  $options 调用参数 ['only'=>[...]] 或者 ['except'=>[...]]
     * @return void
     */
    protected function beforeAction($method, $options = [])
    {
        if (isset($options['only'])) {
            if (is_string($options['only'])) {
                $options['only'] = explode(',', $options['only']);
            }

            if (!in_array($this->request->action(), $options['only'])) {
                return;
            }
        } elseif (isset($options['except'])) {
            if (is_string($options['except'])) {
                $options['except'] = explode(',', $options['except']);
            }

            if (in_array($this->request->action(), $options['except'])) {
                return;
            }
        }

        call_user_func([$this, $method]);
    }

    /**
     * 设置验证失败后是否抛出异常
     * @access protected
     * @param bool $fail 是否抛出异常
     * @return $this
     */
    protected function validateFailException($fail = true)
    {
        $this->failException = $fail;

        return $this;
    }

    /**
     * 验证数据
     * @access protected
     * @param array        $data     数据
     * @param string|array $validate 验证器名或者验证规则数组
     * @param array        $message  提示信息
     * @param bool         $batch    是否批量验证
     * @param mixed        $callback 回调方法（闭包）
     * @return array|string|true
     * @throws ValidateException
     */
    protected function validate($data, $validate, $message = [], $batch = false, $callback = null)
    {
        if (is_array($validate)) {
            $v = Loader::validate();
            $v->rule($validate);
        } else {
            // 支持场景
            if (strpos($validate, '.')) {
                list($validate, $scene) = explode('.', $validate);
            }

            $v = Loader::validate($validate);

            !empty($scene) && $v->scene($scene);
        }

        // 批量验证
        if ($batch || $this->batchValidate) {
            $v->batch(true);
        }
        // 设置错误信息
        if (is_array($message)) {
            $v->message($message);
        }
        // 使用回调验证
        if ($callback && is_callable($callback)) {
            call_user_func_array($callback, [$v, &$data]);
        }

        if (!$v->check($data)) {
            if ($this->failException) {
                throw new ValidateException($v->getError());
            }

            return $v->getError();
        }

        return true;
    }

    /**
     * 刷新Token
     */
    protected function token()
    {
        $token = $this->request->param('__token__');

        //验证Token
        if (!Validate::make()->check(['__token__' => $token], ['__token__' => 'require|token'])) {
            $this->error(__('Token verification error'), ['__token__' => $this->request->token()]);
        }

        //刷新Token
        $this->request->token();
    }

    /**
     * 支付成功
     * @param array $order_info 订单信息
     * @param int $vip_endtime 会员到期时间
     * @param string $type 支付类型，可选值：apple、google
     * @return bool 成功返回true，失败返回false
     */
    public function pay_success($order_info, $type = 'apple',$time = '')
    {
        try {
            $user_id = $order_info['user_id'];
            $vip_endtime = User::where('id', $user_id)->value('vip_endtime');
            
            \think\Log::info('pay_success start - user_id: ' . $user_id . ', type: ' . $type . ', recharge_type: ' . $order_info['recharge_type'] . ', time: ' . $time . ', current vip_endtime: ' . $vip_endtime);
            
            // 处理充值
            if ($order_info['recharge_type'] == 'gold') {
                // 记录充值金币
                $lang_template = 'Recharge $%s, receive %s coins';
                $lang_params = $order_info['current_price'] . ',' . $order_info['amount'];
                switch ($type) {
                    case 'newebpay':
                        $enum = 'money_recharge_newebpay';
                        break;
                    case 'apple':
                        $enum = LogService::CONTENT_TYPE_MONEY_RECHARGE_APPLE;
                        break;
                    case 'google':
                        $enum = LogService::CONTENT_TYPE_MONEY_RECHARGE_GOOGLE;
                        break;
                    case 'stripe':
                        $enum = LogService::CONTENT_TYPE_MONEY_RECHARGE_SYSTEM;
                        break;
                    case 'paypal':
                        $enum = LogService::CONTENT_TYPE_MONEY_RECHARGE_PAYPAL;
                        break;
                }

                $log_result = LogService::recordMoneyLog(
                    $user_id,
                    1,
                    $order_info['amount'],
                    '充值$' . $order_info['current_price'] . '，获得金币:' . $order_info['amount'] . '个',
                    $enum,
                    $order_info['id'],
                    $lang_template,
                    $lang_params
                );
                if (!$log_result['success']) {
                    throw new \Exception('Record money log failed');
                }

                // 记录赠送金币
                if ($order_info['bonus_gold'] > 0) {
                    $lang_template = 'Recharge $%s, gift %s coins';
                    $lang_params = $order_info['current_price'] . ',' . $order_info['bonus_gold'];
                    $log_result = LogService::recordMoneyLog(
                        $user_id,
                        1,
                        $order_info['bonus_gold'],
                        '充值$' . $order_info['current_price'] . '，赠送金币:' . $order_info['bonus_gold'] . '个',
                        LogService::CONTENT_TYPE_MONEY_RECHARGE_GIFT,
                        $order_info['id'],
                        $lang_template,
                        $lang_params
                    );
                    if (!$log_result['success']) {
                        throw new \Exception('Record bonus money log failed');
                    }
                }
            } elseif ($order_info['recharge_type'] == 'vip') {
                $newEndtime = max($vip_endtime, time()) + ($order_info['amount'] * 86400);
                // 更新会员信息
                Db::name('user')->where('id', $user_id)->update([
                    'group_id' => 2,
                    'vip_endtime' => $newEndtime,
                ]);

                // 记录变更日志
                Db::name('user_vip_log')->insert([
                    'user_id' => $user_id,
                    'action' => 'set_vip',
                    'description' => '会员充值',
                    'old_endtime' => $vip_endtime,
                    'new_endtime' => $newEndtime,
                ]);

            }
            // // 处理分销逻辑
            // $result = $this->handleDistribution($order_info, $user_id);
            // if (!$result) {
            //     throw new \Exception('Distribution process failed');
            // }
            
            return true;
        } catch (\Exception $e) {
            \think\Log::write('Pay success process error: ' . $e->getMessage(), 'error');
            throw $e; // 向上抛出异常，让外层事务捕获处理
        }
    }

    /**
     * 处理分销逻辑
     */
    protected function handleDistribution($order_info, $user_id)
    {
        try {
            $is_distribution = config('site.is_distribution');

            if ($is_distribution == 1) {

                // 获取分销比例配置
                $proportion = Config::get('site.proportion');
                $distribution_settings = Config::get('site.distribution_sitting');

                // 计算可分配的金额
                $distributable_amount = $order_info['current_price'] * $proportion;

                // 获取用户的推荐关系链
                $user_info = User::where('id', $user_id)->field('pid')->find();
                $ppid = User::where('id', $user_info['pid'])->value('pid'); // 修正获取间推ID的方式

                if ($user_info['pid']) {
                    // 计算直推奖励积分
                    $direct_score = $distributable_amount * $distribution_settings[1];
                    
                    $lang_template = 'Distribution direct, receive %s score';
                    $lang_params = $direct_score;
                    
                    $log_result = LogService::recordScoreLog(
                        $user_info['pid'],
                        1,
                        $direct_score,
                        '下级充值分销奖励',
                        LogService::CONTENT_TYPE_SCORE_DISTRIBUTION_DIRECT,
                        $user_id,
                        $lang_template,
                        $lang_params
                    );
                    
                    if (!$log_result['success']) {
                        throw new \Exception('Record direct distribution log failed');
                    }

//                    if ($ppid) {
//                        // 计算间推奖励积分
//                        $indirect_score = $distributable_amount * $distribution_settings[2];
//
//                        $lang_template = 'Distribution indirect, receive %s score';
//                        $lang_params = $indirect_score;
//
//                        $log_result = LogService::recordScoreLog(
//                            $ppid,
//                            1,
//                            $indirect_score,
//                            '二级下级充值分销奖励',
//                            LogService::CONTENT_TYPE_SCORE_DISTRIBUTION_INDIRECT,
//                            $user_id,
//                            $lang_template,
//                            $lang_params
//                        );
                        
//                        if (!$log_result['success']) {
//                            throw new \Exception('Record indirect distribution log failed');
//                        }
//                    }
                }
            }
            return true;
        } catch (\Exception $e) {
            \think\Log::write('Distribution process error: ' . $e->getMessage(), 'error');
            throw $e; // 向上抛出异常，让外层事务捕获处理
        }
    }


    /**
     * 获取设备信息
     */
    protected function getDeviceInfo()
    {
        $userAgent = $this->request->server('HTTP_USER_AGENT');
        $deviceType = 'unknown';
        $deviceModel = 'unknown';

        // 获取设备类型
        if (stripos($userAgent, 'iphone') !== false || stripos($userAgent, 'ipad') !== false) {
            $deviceType = 'ios';
            // 提取 iOS 设备型号
            if (preg_match('/\((iPhone|iPad|iPod touch);/i', $userAgent, $matches)) {
                $deviceModel = $matches[1];
            }
        } elseif (stripos($userAgent, 'android') !== false) {
            $deviceType = 'android';
            // 提取 Android 设备型号
            if (preg_match('/\((.*?)\)/i', $userAgent, $matches)) {
                $deviceInfo = explode(';', $matches[1]);
                foreach ($deviceInfo as $info) {
                    if (stripos($info, 'Build/') !== false) {
                        $deviceModel = trim(substr($info, 0, strpos($info, 'Build/')));
                        break;
                    }
                }
            }
        }

        return [
            'device_type' => $deviceType,
            'device_model' => $deviceModel,
        ];
    }
}
