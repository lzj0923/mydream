<?php
// Support both process environment and ThinkPHP's existing server-side .env loader.
$value = function ($name, $default = '') {
    $process = getenv('NEWEBPAY_'.strtoupper($name));
    return $process !== false ? $process : \think\Env::get('newebpay.'.$name, $default);
};
return [
    'enabled' => in_array($value('enabled', false), [true, 'true'], true),
    'environment' => $value('environment', 'test'),
    'merchant_id' => $value('merchant_id'),
    'hash_key' => $value('hash_key'),
    'hash_iv' => $value('hash_iv'),
    'site_url' => $value('site_url'),
    'notify_url' => $value('notify_url'),
];
