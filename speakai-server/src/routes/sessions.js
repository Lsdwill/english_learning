import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// POST /sessions — create new session
router.post('/', async (req, res) => {
  try {
    const [result] = await pool.query('INSERT INTO sessions () VALUES ()');
    res.json({ session_id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /sessions — list all sessions with message count
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.created_at,
        COUNT(m.id) AS message_count
      FROM sessions s
      LEFT JOIN messages m ON m.session_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /sessions/:id — get all messages for a session
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
