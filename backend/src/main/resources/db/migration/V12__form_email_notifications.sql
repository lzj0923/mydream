-- 联系表单邮件通知设置与逐条投递状态。
CREATE TABLE cms_form_notification_setting (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  form_key VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(254) NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_form_notification_setting (site_id, form_key),
  CONSTRAINT fk_form_notification_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO cms_form_notification_setting(site_id,form_key,recipient_email,enabled)
SELECT form.site_id,form.form_key,'',FALSE
FROM cms_form_definition form
WHERE form.form_key='business-contact';

ALTER TABLE cms_form_submission
  ADD COLUMN email_status VARCHAR(24) NOT NULL DEFAULT 'NOT_CONFIGURED' AFTER status,
  ADD COLUMN email_recipient VARCHAR(254) NULL AFTER email_status,
  ADD COLUMN email_sent_at DATETIME(6) NULL AFTER email_recipient,
  ADD COLUMN email_error VARCHAR(500) NULL AFTER email_sent_at,
  ADD KEY idx_form_submission_email (site_id,email_status,created_at);
