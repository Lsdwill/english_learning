import { Router } from 'express';
import multer from 'multer';
import OSS from 'ali-oss';
import pool from '../db.js';
import { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION } from '../config.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const ossClient = new OSS({
  region: `oss-${OSS_REGION}`,
  accessKeyId: OSS_ACCESS_KEY_ID,
  accessKeySecret: OSS_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET,
});

// POST /favorites — upsert (prevents duplicates by user_text hash)
router.post('/', async (req, res) => {
  const { user_text, grammar, native, ai_reply } = req.body;
  if (!user_text) return res.status(400).json({ error: 'user_text required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO favorites (user_text, grammar, native, ai_reply)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         grammar   = VALUES(grammar),
         native    = VALUES(native),
         ai_reply  = VALUES(ai_reply),
         created_at = CURRENT_TIMESTAMP`,
      [user_text, grammar ?? null, native ?? null, ai_reply ?? null]
    );
    // insertId is 0 on update, fetch the actual row id
    const id = result.insertId || (await pool.query(
      'SELECT id FROM favorites WHERE text_hash = SHA2(?, 256)', [user_text]
    ))[0][0]?.id;
    res.json({ id, updated: result.affectedRows === 2 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /favorites/:id/audio — upload user/ai audio to OSS, update URLs
router.post('/:id/audio', upload.fields([
  { name: 'user_audio', maxCount: 1 },
  { name: 'ai_audio', maxCount: 1 },
]), async (req, res) => {
  const { id } = req.params;
  const files = req.files;
  const updates = [];
  const values = [];

  try {
    for (const field of ['user_audio', 'ai_audio']) {
      const file = files?.[field]?.[0];
      if (!file) continue;
      const ossKey = `speakai-audio/fav-${id}-${field}-${Date.now()}.m4a`;
      await ossClient.put(ossKey, file.buffer, {
        headers: { 'Content-Type': 'audio/m4a' },
      });
      const url = ossClient.signatureUrl(ossKey, { expires: 365 * 24 * 3600 });
      const col = field === 'user_audio' ? 'user_audio_url' : 'ai_audio_url';
      updates.push(`${col} = ?`);
      values.push(url);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'no audio files provided' });

    values.push(id);
    await pool.query(`UPDATE favorites SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /favorites
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM favorites ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /favorites/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM favorites WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /favorites/by-text — delete by user_text hash
router.delete('/by-text', async (req, res) => {
  const { user_text } = req.body;
  if (!user_text) return res.status(400).json({ error: 'user_text required' });
  try {
    await pool.query('DELETE FROM favorites WHERE text_hash = SHA2(?, 256)', [user_text]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
