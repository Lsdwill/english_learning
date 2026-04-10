/**
 * Cleanup job: delete OSS audio files whose 90-day retention has expired.
 * Runs every 24 hours.
 *
 * Strategy:
 * - Query messages where expires_at < NOW() and oss_key IS NOT NULL
 * - Delete each file from OSS
 * - Null out oss_key in DB
 */
import OSS from 'ali-oss';
import pool from '../db.js';
import { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION } from '../config.js';

const ossClient = new OSS({
  region: `oss-${OSS_REGION}`,
  accessKeyId: OSS_ACCESS_KEY_ID,
  accessKeySecret: OSS_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET,
});

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function runCleanup() {
  console.log('[cleanup] starting audio cleanup job');
  try {
    const [rows] = await pool.query(
      `SELECT id, oss_key FROM messages
       WHERE oss_key IS NOT NULL AND expires_at < NOW()`
    );

    if (rows.length === 0) {
      console.log('[cleanup] nothing to clean up');
      return;
    }

    console.log(`[cleanup] found ${rows.length} expired audio files`);

    for (const row of rows) {
      try {
        await ossClient.delete(row.oss_key);
        await pool.query('UPDATE messages SET oss_key = NULL WHERE id = ?', [row.id]);
        console.log('[cleanup] deleted:', row.oss_key);
      } catch (e) {
        console.warn('[cleanup] failed to delete', row.oss_key, e.message);
      }
    }
  } catch (e) {
    console.error('[cleanup] error:', e.message);
  }
}

export function startCleanupJob() {
  // Run once on startup (catches any missed runs), then every 24h
  runCleanup();
  setInterval(runCleanup, INTERVAL_MS);
  console.log('[cleanup] job scheduled every 24h');
}
