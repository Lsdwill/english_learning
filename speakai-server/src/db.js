import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://root:123456@127.0.0.1:3309/ink');

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        role ENUM('user','ai') NOT NULL,
        text TEXT NOT NULL,
        grammar TEXT,
        native TEXT,
        oss_key VARCHAR(512) DEFAULT NULL,
        expires_at DATETIME GENERATED ALWAYS AS (DATE_ADD(created_at, INTERVAL 90 DAY)) STORED,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Migrate: add oss_key column if it doesn't exist (for existing tables)
    await conn.query(`
      ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS oss_key VARCHAR(512) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS expires_at DATETIME AS (DATE_ADD(created_at, INTERVAL 90 DAY)) STORED
    `).catch(() => {}); // ignore if columns already exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) DEFAULT NULL,
        user_text TEXT NOT NULL,
        grammar TEXT,
        native TEXT,
        ai_reply TEXT,
        user_audio_url VARCHAR(512) DEFAULT NULL,
        ai_audio_url VARCHAR(512) DEFAULT NULL,
        text_hash VARCHAR(64) GENERATED ALWAYS AS (SHA2(user_text, 256)) STORED,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_text (text_hash(64))
      )
    `);
    console.log('[db] Tables ready');
  } finally {
    conn.release();
  }
}

initDB().catch(e => console.error('[db] init error:', e));

export default pool;
