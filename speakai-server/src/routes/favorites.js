import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { user_text, grammar, native, ai_reply, user_audio_url } = req.body;
  if (!user_text) return res.status(400).json({ error: 'user_text required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO favorites (user_id, user_text, grammar, native, ai_reply, user_audio_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         grammar = VALUES(grammar), native = VALUES(native),
         ai_reply = VALUES(ai_reply), user_audio_url = VALUES(user_audio_url),
         created_at = CURRENT_TIMESTAMP`,
      [req.user.userId, user_text, grammar ?? null, native ?? null, ai_reply ?? null, user_audio_url ?? null]
    );
    const id = result.insertId || (await pool.query(
      'SELECT id FROM favorites WHERE text_hash = SHA2(?, 256) AND user_id = ?', [user_text, req.user.userId]
    ))[0][0]?.id;
    res.json({ id, updated: result.affectedRows === 2 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM favorites WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/by-text', async (req, res) => {
  const { user_text } = req.body;
  if (!user_text) return res.status(400).json({ error: 'user_text required' });
  try {
    await pool.query(
      'DELETE FROM favorites WHERE text_hash = SHA2(?, 256) AND user_id = ?',
      [user_text, req.user.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
