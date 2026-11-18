CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, email_verified INTEGER NOT NULL DEFAULT 0, image TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY NOT NULL, expires_at INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS session_user_idx ON session(user_id);
CREATE TABLE IF NOT EXISTS account (id TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, access_token TEXT, refresh_token TEXT, id_token TEXT, access_token_expires_at INTEGER, refresh_token_expires_at INTEGER, scope TEXT, password TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS account_user_idx ON account(user_id);
CREATE TABLE IF NOT EXISTS verification (id TEXT PRIMARY KEY NOT NULL, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);
CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE, currency TEXT NOT NULL DEFAULT 'UZS');
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, type TEXT NOT NULL CHECK(type IN ('income','expense')), name TEXT NOT NULL, name_key TEXT NOT NULL, archived_at TEXT, created_at TEXT NOT NULL, UNIQUE(id,user_id,type));
CREATE UNIQUE INDEX IF NOT EXISTS categories_active_name_idx ON categories(user_id,type,name_key) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS categories_user_idx ON categories(user_id,type,archived_at);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, category_id TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('income','expense')), amount_minor INTEGER NOT NULL CHECK(amount_minor > 0), date TEXT NOT NULL, comment TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(category_id,user_id,type) REFERENCES categories(id,user_id,type));
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id,date,id);
CREATE INDEX IF NOT EXISTS transactions_category_date_idx ON transactions(user_id,category_id,date);
CREATE TRIGGER IF NOT EXISTS user_defaults AFTER INSERT ON user BEGIN
  INSERT INTO profiles(user_id) VALUES (NEW.id);
  INSERT INTO categories(id,user_id,type,name,name_key,created_at) VALUES
    (lower(hex(randomblob(16))), NEW.id, 'income', 'Зарплата', 'зарплата', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    (lower(hex(randomblob(16))), NEW.id, 'income', 'Другие доходы', 'другие доходы', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    (lower(hex(randomblob(16))), NEW.id, 'expense', 'Продукты', 'продукты', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    (lower(hex(randomblob(16))), NEW.id, 'expense', 'Транспорт', 'транспорт', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    (lower(hex(randomblob(16))), NEW.id, 'expense', 'Жильё', 'жильё', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    (lower(hex(randomblob(16))), NEW.id, 'expense', 'Другое', 'другое', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
