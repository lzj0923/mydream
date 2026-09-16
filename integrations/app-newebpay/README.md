# 蓝新金币与会员支付接入

## 当前状态

2026-09-15 已部署官网购买入口、蓝新 MPG 2.3 表单、App 订单持久化、签名验真、事务到账和本人订单查询。正式环境已启用，商店代号 `MS3842674945`。尚未完成真实刷卡与到账验收；部署过程没有创建真实订单或扣款。模板仍默认关闭，避免新环境未经检查即收款。

依据用户提供的《線上交易─幕前支付技術串接手冊 NDNF-1.2.5》：AES-256-CBC/PKCS7、TradeSha SHA256、JSON 回传、信用卡一次付清。浏览器直接 Form POST 到蓝新支付页面。会员是一次购买固定天数，不自动续费。

## 上线所需资料

已由用户确认：正式环境，商店代号 `MS3842674945`，官网 `https://official.mydream.tw`；HashKey、HashIV 已通过会话提供，未写入仓库。无密钥的部署模板见本目录 `.env.example`。

根据现有 App 入口，通知地址设为 `https://share.the-drama-has-a-plot.com/api/newebpay/notify`，付款返回地址为 `https://official.mydream.tw/api/payments/return`。部署后检查：官网 `/healthz`、`/tasks`、`/tasks/payment` 返回 200；App 通知 GET 返回 405，无有效签名 POST 返回 400。合法通知必须通过数据库到账验证后才返回 200。

- 同一商店、同一环境的 MerchantID、HashKey、HashIV。密钥由服务器环境注入，不写入仓库或 NEXT_PUBLIC 变量。
- 金钥属于测试还是正式环境。
- 官网 HTTPS 域名，以及 App 可被蓝新访问的 HTTPS 通知地址。
- App 服务器部署通道；必须部署 App 端程序及订单表，仅部署 Next.js 无法开通收款。

## App 部署

1. 在 App 的数据库执行 `001_newebpay_orders.sql`。表前缀按实际配置调整；订单、user、user_money_log、user_vip_log 必须在同一数据库连接且使用 InnoDB。
2. 将本目录 `application` 内三个 PHP 文件按原目录部署到 App。
3. 先备份线上 `application/common/controller/Api.php`，在 App 根目录用 `patch --dry-run -p1 < /path/to/pay-success.patch` 检查补丁，再用 `patch -p1 < /path/to/pay-success.patch` 应用；若检查失败或已经存在该分支，停止并核对文件。补丁只向 `pay_success` 的金币类型 switch 添加以下分支，避免覆盖服务器已有改动：

   ```php
   case 'newebpay':
       $enum = 'money_recharge_newebpay';
       break;
   ```

4. 配置 PHP-FPM/容器进程环境（若 FPM 清空环境，应通过池配置 `env[...]` 传入），重载 PHP。当前 App 部署使用 ThinkPHP 已有的服务器 `.env` 文件，在 `[newebpay]` 节配置下列名称去除 `NEWEBPAY_` 后的小写字段，例如 `merchant_id`、`hash_key`、`enabled`。该文件位于网站 public 根目录以外，权限为 `640 www:www`；本次没有放宽 PHP 的 open_basedir 限制：

   ```dotenv
   NEWEBPAY_ENABLED=false
   NEWEBPAY_ENVIRONMENT=test
   NEWEBPAY_MERCHANT_ID=
   NEWEBPAY_HASH_KEY=
   NEWEBPAY_HASH_IV=
   NEWEBPAY_SITE_URL=https://YOUR-WEBSITE
   NEWEBPAY_NOTIFY_URL=https://YOUR-APP/api/newebpay/notify
   ```

5. 官网继续使用既有 `APP_AUTH_API_URL` 连接 App，`NEXT_PUBLIC_SITE_URL` 应与支付官网域名一致。官网不持有蓝新密钥。
6. 确认蓝新商店已启用信用卡、官网域名及回调地址配置正确。Notify 接口不经登录页，不被 WAF、HTTP 跳转、CSRF 中间件拦截，允许蓝新 HTTPS POST；只有该回调不需要用户登录。
7. 在隔离的测试 App 数据库、测试账户和测试商店联调。测试成功也会执行到账逻辑，不能将测试商店连接真实用户数据库。
8. 使用正式商店对应的完整配置，确认套餐金额与商店审核范围后，设置 `NEWEBPAY_ENVIRONMENT=production`、`NEWEBPAY_ENABLED=true`。切换环境不得遗留未处理交易；更换密钥前处理旧密钥下的待付款订单。

## 实际业务行为

- 专属测试链接为 `/tasks/test/<随机口令>`。服务器仅保存口令 SHA256；有效口令下八个原套餐每次均收 NT$1，金币数量/会员天数按原套餐发放给下单时登录的用户。无需指定 App 用户 ID，未登录必须先登录；公开价目不变。付款属于正式实付，不是蓝新沙箱。
- 测试订单 `product_id` 带 `test-` 前缀，金额快照为 1。清空服务器 `[newebpay]` 下的 `test_channel_hash` 可关闭新测试订单；不会影响已创建订单的正常支付通知到账。
- 链接不加入导航或站点地图，页面声明 noindex/nofollow、no-referrer。持有链接且登录的用户均能使用，链接不应公开传播。

- 官网只提交 productId 和页面价格，价格仅用于检测页面过期；实际扣款金额、金币和会员天数由 App 端商品目录确定。
- 现有价目保持不变：500/700/1500/2500 金币分别 NT$100/280/480/850；7/30/90/365 天会员分别 NT$240/590/1390/4390。
- App 用当前登录用户创建订单，不接受浏览器指定 user_id、金币数量或会员天数。
- Notify 先验证 TradeSha 并解密，再匹配商店、订单、环境、金额、交易号和信用卡授权结果。
- 订单锁、用户锁、原 App `pay_success`、余额流水及订单成功状态在一个数据库事务内处理；通知重复不重复到账，流水失败则全部回滚并返回 503 让蓝新重试。
- ReturnURL 只执行 303 跳转，不能修改付款或余额状态。结果页每 5 秒查询本人最近订单，最多自动查询 1 分钟，之后可手动刷新。
- 会员从 `max(当前到期时间, 当前时间)` 延长。金币使用原余额逻辑；本次未新增金币批次有效期/过期扣除机制，页面已有“一年内有效”的规则仍需与 App 现行实现核对。
- 未付款、支付失败、取消的订单都保持 pending，不授予权益；页面显示“尚未付款或付款确认中”。此版本不实现退款、自动对账及超时订单清理。

## 运维与验收

- 真正启用前测试：登录购买、取消、失败、成功、重复 Notify、通知早于/晚于返回、App 数据库暂时故障后重试、刷新账户金币/VIP、他人无法查询订单。
- 若蓝新重试耗尽，先在商店后台核对交易与本地订单，再使用蓝新提供的重新通知流程（如有）；不得直接手动改余额或仅凭截图标记成功。本版本没有主动 QueryTradeInfo 对账补偿。
- 退款应同时处理金流退款与 App 权益撤销，并记录审计；本版本未提供退款按钮。
- 生产检查并保留订单表和流水备份；日志只记录处理失败，不记录密钥、完整通知或卡资料。

## 本地测试

```text
node --experimental-strip-types --loader ./tests/alias-loader.mjs --test tests/payments.test.ts tests/app-auth.test.ts
php integrations/app-newebpay/tests/protocol.php
php integrations/app-newebpay/tests/action-guard.php
php integrations/app-newebpay/tests/checkout-channel.php
php integrations/app-newebpay/tests/settlement.php
```

settlement 测试使用本地 `127.0.0.1:3309` 的 MySQL，创建随机 `newebpay_test_*` 库，测试结束仅删除该随机库。运行实际通知处理、原 App pay_success 和 LogService；仅以小型 PDO 适配层替代 ThinkPHP 查询及模型入口。覆盖重复到账防护、金额错误、失败通知、流水失败回滚、重试补发、重复交易号和会员续期。完整 App 框架认证与真实蓝新收款仍需部署后联调。
