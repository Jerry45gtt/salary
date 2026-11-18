CREATE TABLE IF NOT EXISTS currency_locks (user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE);
INSERT OR IGNORE INTO currency_locks(user_id) SELECT DISTINCT user_id FROM transactions;
CREATE TRIGGER IF NOT EXISTS transaction_locks_currency AFTER INSERT ON transactions BEGIN
  INSERT OR IGNORE INTO currency_locks(user_id) VALUES (NEW.user_id);
END;
