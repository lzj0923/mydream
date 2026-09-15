CREATE TABLE cms_creator_agreement_template (
  kind VARCHAR(20) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cms_creator_agreement_template(kind,title,body) VALUES
('MEMBERSHIP','創作者平台分成合作協議（佔位文件）','【演示文件，非正式合同】\n本文件僅供測試申請、簽署確認及平台審核流程，不產生正式簽約或收益結算依據。\n\n一、合作雙方\n平台主體：【待填寫】\n創作者：以本次提交的姓名及聯絡資料為準。\n\n二、合作範圍\n原創投稿、內容製作、作品發行及收益合作，具體範圍待正式協議確認。\n\n三、分成與結算\n分成比例：【待雙方確認】\n收益計算口徑、成本扣除、結算週期及付款安排：【待填寫】\n\n四、權利與責任\n原創及授權聲明、使用範圍、合作期限、終止及爭議處理：【待填寫】\n\n正式合作前須替換完整正式文件並另行簽署，本次演示確認不自動轉為正式簽約。'),
('PROJECT','項目合作與交付確認書（佔位文件）','【演示文件，非正式合同】\n本文件僅供測試項目簽約及交付銜接，不作為正式授權或結算依據。\n\n一、項目資料\n以本次審核通過的項目名稱及計劃集數為準。\n\n二、製作及交付\n製作範圍、每集規格、交付期限、驗收標準及修改次數：【待雙方確認】\n\n三、項目權益\nIP 授權範圍、發行渠道、合作期限、分成比例及結算方式：【待填寫】\n\n四、確認流程\n創作者提交確認後，由平台審核；平台確認後開放本項目的逐集上傳。\n\n正式製作合作須另行使用完整正式文件，本次演示記錄不能替代正式合同。');

CREATE TABLE cms_creator_agreement (
  id CHAR(36) PRIMARY KEY,
  owner_key VARCHAR(191) NOT NULL,
  scope_key VARCHAR(80) NOT NULL,
  attempt INT NOT NULL,
  kind VARCHAR(20) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  template_version INT NOT NULL,
  document_hash CHAR(64) NOT NULL,
  context_text VARCHAR(500) NOT NULL DEFAULT '',
  signer_name VARCHAR(80) NOT NULL,
  contact VARCHAR(160) NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  review_note VARCHAR(1000) NOT NULL DEFAULT '',
  reviewer VARCHAR(191) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  UNIQUE KEY uk_agreement_attempt (owner_key,scope_key,attempt),
  INDEX idx_agreement_review (state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
