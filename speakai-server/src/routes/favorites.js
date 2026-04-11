import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// POST /favorites — upsert (prevents duplicates by user_text hash)
router.post('/', async (req, res) => {
  const { user_text, grammar, native, ai_reply, user_audio_url } = req.body;
  if (!user_text) return res.status(400).json({ error: 'user_text required' });
  console.log('[favorites] POST user_audio_url:', user_audio_url?.slice(0, 60) ?? 'null');
  try {
    const [result] = await pool.query(
      `INSERT INTO favorites (user_text, grammar, native, ai_reply, user_audio_url)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         grammar        = VALUES(grammar),
         native         = VALUES(native),
         ai_reply       = VALUES(ai_reply),
         user_audio_url = VALUES(user_audio_url),
         created_at     = CURRENT_TIMESTAMP`,
      [user_text, grammar ?? null, native ?? null, ai_reply ?? null, user_audio_url ?? null]
    );
    const id = result.insertId || (await pool.query(
      'SELECT id FROM favorites WHERE text_hash = SHA2(?, 256)', [user_text]
    ))[0][0]?.id;
    res.json({ id, updated: result.affectedRows === 2 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /favorites
router.get('/', async (_req, res) => {
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

// DELETE /favorites/by-text
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
