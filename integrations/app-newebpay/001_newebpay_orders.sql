-- Run against the App database (adjust fa_ only if its configured prefix differs).
CREATE TABLE IF NOT EXISTS fa_newebpay_order (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 order_no VARCHAR(30) NOT NULL,
 user_id INT UNSIGNED NOT NULL,
 product_id VARCHAR(32) NOT NULL,
 title VARCHAR(100) NOT NULL,
 current_price INT UNSIGNED NOT NULL,
 recharge_type VARCHAR(8) NOT NULL,
 amount INT UNSIGNED NOT NULL,
 merchant_id VARCHAR(15) NOT NULL,
 environment VARCHAR(10) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'pending',
 trade_no VARCHAR(30) NULL,
 created_at INT UNSIGNED NOT NULL,
 paid_at INT UNSIGNED NULL,
 UNIQUE KEY uq_newebpay_order (order_no),
 UNIQUE KEY uq_newebpay_trade (merchant_id, environment, trade_no),
 KEY idx_newebpay_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
