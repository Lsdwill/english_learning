import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://root:123456@127.0.0.1:3309/ink');

/** Add a column only if it doesn't already exist (MySQL 8.0 compatible) */
async function addColumnIfMissing(conn, table, column, definition) {
  const dbName = (await conn.query('SELECT DATABASE() AS db'))[0][0].db;
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, table, column]
  );
  if (rows.length === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[db] migrated: ${table}.${column} added`);
  }
}

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await addColumnIfMissing(conn, 'sessions', 'user_id', 'INT DEFAULT NULL');
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
    await addColumnIfMissing(conn, 'messages', 'oss_key', 'VARCHAR(512) DEFAULT NULL');
    await addColumnIfMissing(conn, 'messages', 'expires_at', 'DATETIME GENERATED ALWAYS AS (DATE_ADD(created_at, INTERVAL 90 DAY)) STORED');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) DEFAULT NULL,
        user_text TEXT NOT NULL,
        grammar TEXT,
        native TEXT,
        ai_reply TEXT,
        user_audio_url VARCHAR(512) DEFAULT NULL,
        text_hash VARCHAR(64) GENERATED ALWAYS AS (SHA2(user_text, 256)) STORED,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_text (text_hash(64))
      )
    `);
    await addColumnIfMissing(conn, 'favorites', 'user_audio_url', 'VARCHAR(512) DEFAULT NULL');
    await addColumnIfMissing(conn, 'favorites', 'user_id', 'INT DEFAULT NULL');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS polish_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        original TEXT NOT NULL,
        polished TEXT NOT NULL,
        explanation TEXT,
        mode ENUM('casual', 'business') DEFAULT 'casual',
        user_oss_key VARCHAR(512) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await addColumnIfMissing(conn, 'polish_favorites', 'user_oss_key', 'VARCHAR(512) DEFAULT NULL');
    await addColumnIfMissing(conn, 'polish_favorites', 'user_id', 'INT DEFAULT NULL');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        google_id VARCHAR(128) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        avatar VARCHAR(512),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await addColumnIfMissing(conn, 'users', 'google_id', 'VARCHAR(128) NOT NULL DEFAULT ""');
    await addColumnIfMissing(conn, 'users', 'email', 'VARCHAR(255) NOT NULL DEFAULT ""');
    await addColumnIfMissing(conn, 'users', 'name', 'VARCHAR(255)');
    await addColumnIfMissing(conn, 'users', 'avatar', 'VARCHAR(512)');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS vocabulary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        word TEXT NOT NULL,
        word_hash VARCHAR(64) GENERATED ALWAYS AS (SHA2(word, 256)) STORED,
        explanation TEXT NOT NULL,
        example TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_word (word_hash(64))
      )
    `);
    await addColumnIfMissing(conn, 'vocabulary', 'user_id', 'INT DEFAULT NULL');

    console.log('[db] Tables ready');
  } finally {
    conn.release();
  }
}

initDB().catch(e => console.error('[db] init error:', e));

export default pool;
