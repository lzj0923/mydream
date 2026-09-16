<?php
namespace think\exception {
    class HttpResponseException extends \Exception {
        public $response;
        public function __construct($response) { $this->response = $response; }
    }
}
namespace app\common\controller {
    class Api {
        protected $request;
        public $initialized = false;
        public function __construct($action) {
            $this->request = new class($action) {
                private $action;
                public function __construct($action) { $this->action = $action; }
                public function action() { return $this->action; }
            };
            $this->_initialize();
        }
        protected function _initialize() { $this->initialized = true; }
    }
}
namespace {
    function response($body, $code) { return ['status' => $code]; }
    require __DIR__.'/../application/api/controller/Newebpay.php';
    foreach (['checkout', 'orders', 'notify', 'testchannel'] as $action) {
        $controller = new \app\api\controller\Newebpay($action);
        if (!$controller->initialized) throw new \Exception('Authentication initialization bypassed');
    }
    foreach (['pay_success', 'paySuccess', 'handleDistribution', '_initialize'] as $action) {
        try { new \app\api\controller\Newebpay($action); }
        catch (\think\exception\HttpResponseException $error) {
            if ($error->response['status'] === 404) continue;
        }
        throw new \Exception('Business helper exposed as HTTP action');
    }
    echo "PASS: only payment actions and private catalog exposed, App authentication initialization retained\n";
}
