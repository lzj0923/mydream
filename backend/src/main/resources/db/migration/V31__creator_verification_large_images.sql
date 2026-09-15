-- Three 5 MiB images expand through base64 and encrypted payload encoding.
ALTER TABLE cms_creator_verification MODIFY payload_encrypted LONGTEXT NOT NULL;
