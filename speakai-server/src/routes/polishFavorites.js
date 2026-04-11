import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// POST /polish-favorites
router.post('/', async (req, res) => {
  const { original, polished, explanation, mode, user_oss_key } = req.body;
  if (!original || !polished) return res.status(400).json({ error: 'original and polished required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO polish_favorites (original, polished, explanation, mode, user_oss_key) VALUES (?, ?, ?, ?, ?)',
      [original, polished, explanation ?? null, mode ?? 'casual', user_oss_key ?? null]
    );
    res.json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /polish-favorites
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM polish_favorites ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /polish-favorites/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM polish_favorites WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
