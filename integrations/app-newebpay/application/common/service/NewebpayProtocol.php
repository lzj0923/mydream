<?php
namespace app\common\service;

class NewebpayProtocol
{
    public static function products()
    {
        return [
            'coins-500' => ['title'=>'500 金幣', 'price'=>100, 'type'=>'gold', 'amount'=>500],
            'coins-700' => ['title'=>'700 金幣', 'price'=>280, 'type'=>'gold', 'amount'=>700],
            'coins-1500' => ['title'=>'1500 金幣', 'price'=>480, 'type'=>'gold', 'amount'=>1500],
            'coins-2500' => ['title'=>'2500 金幣', 'price'=>850, 'type'=>'gold', 'amount'=>2500],
            'vip-7' => ['title'=>'周會員', 'price'=>240, 'type'=>'vip', 'amount'=>7],
            'vip-30' => ['title'=>'月會員', 'price'=>590, 'type'=>'vip', 'amount'=>30],
            'vip-90' => ['title'=>'季會員', 'price'=>1390, 'type'=>'vip', 'amount'=>90],
            'vip-365' => ['title'=>'年度會員', 'price'=>4390, 'type'=>'vip', 'amount'=>365],
        ];
    }

    public static function validateConfig(array $c)
    {
        if (empty($c['enabled']) || !in_array($c['environment'], ['test','production'], true)
            || !preg_match('/^[A-Za-z0-9]{1,15}$/D', $c['merchant_id'])
            || strlen($c['hash_key']) !== 32 || strlen($c['hash_iv']) !== 16) {
            throw new \RuntimeException('Payment configuration unavailable');
        }
        foreach (['site_url','notify_url'] as $field) {
            $url = parse_url($c[$field]);
            if (!$url || ($url['scheme'] ?? '') !== 'https' || empty($url['host'])
                || isset($url['user']) || isset($url['pass']) || isset($url['fragment'])
                || (isset($url['port']) && $url['port'] !== 443) || strlen($c[$field]) > 150) {
                throw new \RuntimeException('Public HTTPS payment URLs required');
            }
        }
        if (!empty(parse_url($c['site_url'], PHP_URL_QUERY))) throw new \RuntimeException('Invalid site URL');
    }

    public static function sha($encrypted, array $c)
    {
        return strtoupper(hash('sha256', 'HashKey='.$c['hash_key'].'&'.$encrypted.'&HashIV='.$c['hash_iv']));
    }

    public static function checkout(array $order, array $c, $email = '')
    {
        self::validateConfig($c);
        $site = rtrim($c['site_url'], '/');
        $data = [
            'MerchantID'=>$c['merchant_id'], 'RespondType'=>'JSON', 'TimeStamp'=>time(), 'Version'=>'2.3',
            'MerchantOrderNo'=>$order['order_no'], 'Amt'=>$order['current_price'], 'ItemDesc'=>$order['title'],
            'LangType'=>'zh-tw', 'TradeLimit'=>900, 'CREDIT'=>1, 'P3D'=>1,
            'VACC'=>0, 'CVS'=>0, 'BARCODE'=>0, 'WEBATM'=>0, 'CVSCOM'=>0,
            'NotifyURL'=>$c['notify_url'], 'ReturnURL'=>$site.'/api/payments/return',
            'ClientBackURL'=>$site.'/tasks/payment?order='.$order['order_no'],
        ];
        if (filter_var($email, FILTER_VALIDATE_EMAIL) && strlen($email) <= 50) $data['Email'] = $email;
        $encrypted = openssl_encrypt(http_build_query($data), 'AES-256-CBC', $c['hash_key'], OPENSSL_RAW_DATA, $c['hash_iv']);
        if ($encrypted === false) throw new \RuntimeException('Encryption failed');
        $info = bin2hex($encrypted);
        return ['orderNo'=>$order['order_no'], 'environment'=>$c['environment'],
            'gateway'=>$c['environment'] === 'production' ? 'https://core.newebpay.com/MPG/mpg_gateway' : 'https://ccore.newebpay.com/MPG/mpg_gateway',
            'fields'=>['MerchantID'=>$c['merchant_id'], 'TradeInfo'=>$info, 'TradeSha'=>self::sha($info,$c), 'Version'=>'2.3']];
    }

    public static function decode(array $post, array $c)
    {
        self::validateConfig($c);
        $info = $post['TradeInfo'] ?? ''; $sha = $post['TradeSha'] ?? '';
        if (!is_string($info) || !is_string($sha) || strlen($info) > 32768 || strlen($info) % 32 !== 0
            || !preg_match('/^[a-fA-F0-9]+$/D', $info) || !preg_match('/^[A-Fa-f0-9]{64}$/D', $sha)
            || !hash_equals(self::sha($info,$c), strtoupper($sha))
            || ($post['MerchantID'] ?? '') !== $c['merchant_id']) throw new \InvalidArgumentException('Invalid signature');
        $plain = openssl_decrypt(hex2bin($info), 'AES-256-CBC', $c['hash_key'], OPENSSL_RAW_DATA, $c['hash_iv']);
        $data = $plain === false ? null : json_decode($plain, true);
        if (!is_array($data) || !is_string($data['Status'] ?? null)) throw new \InvalidArgumentException('Invalid response');
        $result = $data['Result'] ?? [];
        if (is_string($result)) $result = json_decode($result, true);
        if (!is_array($result) || ($result['MerchantID'] ?? '') !== $c['merchant_id']
            || !preg_match('/^[A-Za-z0-9_]{1,30}$/D', (string)($result['MerchantOrderNo'] ?? '')))
            throw new \InvalidArgumentException('Invalid merchant or order');
        return ['status'=>$data['Status'], 'result'=>$result];
    }

    public static function assertPaidOrder(array $order, array $result, array $c)
    {
        if ($order['merchant_id'] !== $c['merchant_id'] || $order['environment'] !== $c['environment']
            || $order['order_no'] !== ($result['MerchantOrderNo'] ?? '')
            || !preg_match('/^[0-9]+$/D', (string)($result['Amt'] ?? ''))
            || (string)$order['current_price'] !== (string)$result['Amt']
            || !preg_match('/^[0-9]{1,30}$/D', (string)($result['TradeNo'] ?? ''))
            || ($result['PaymentType'] ?? '') !== 'CREDIT'
            || ($result['RespondCode'] ?? '') !== '00') throw new \InvalidArgumentException('Payment does not match order');
    }
}
