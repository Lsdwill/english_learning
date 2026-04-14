import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { original, polished, explanation, mode, user_oss_key } = req.body;
  if (!original || !polished) return res.status(400).json({ error: 'original and polished required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO polish_favorites (user_id, original, polished, explanation, mode, user_oss_key) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, original, polished, explanation ?? null, mode ?? 'casual', user_oss_key ?? null]
    );
    res.json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM polish_favorites WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM polish_favorites WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
