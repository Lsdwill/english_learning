import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// POST /messages — save a message
router.post('/', async (req, res) => {
  const { session_id, role, text, grammar, native, oss_key } = req.body;
  if (!session_id || !role || !text) {
    return res.status(400).json({ error: 'session_id, role, text required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO messages (session_id, role, text, grammar, native, oss_key) VALUES (?, ?, ?, ?, ?, ?)',
      [session_id, role, text, grammar ?? null, native ?? null, oss_key ?? null]
    );
    res.json({ id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
