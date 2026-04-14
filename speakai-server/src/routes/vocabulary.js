import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { DASHSCOPE_API_KEY, LLM_URL, LLM_MODEL } from '../config.js';

const router = Router();

const EXPLAIN_PROMPT = `You are an English vocabulary teacher.
The user gives you a word or phrase. Explain it clearly in simple English.
Respond ONLY with this JSON (no markdown):
{
  "explanation": "A clear, simple English explanation of the meaning in 1-2 sentences",
  "example": "One natural example sentence using this word or phrase"
}`;

// explain 不需要鉴权
router.post('/explain', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'word required' });
  try {
    const upstream = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: EXPLAIN_PROMPT },
          { role: 'user', content: word },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!upstream.ok) throw new Error(`LLM error ${upstream.status}`);
    const data = await upstream.json();
    res.json(JSON.parse(data.choices[0].message.content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.use(requireAuth);

router.post('/', async (req, res) => {
  const { word, explanation, example } = req.body;
  if (!word || !explanation) return res.status(400).json({ error: 'word and explanation required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO vocabulary (user_id, word, explanation, example)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE explanation = VALUES(explanation), example = VALUES(example), created_at = CURRENT_TIMESTAMP`,
      [req.user.userId, word, explanation, example ?? null]
    );
    const id = result.insertId || (await pool.query(
      'SELECT id FROM vocabulary WHERE word_hash = SHA2(?, 256) AND user_id = ?', [word, req.user.userId]
    ))[0][0]?.id;
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM vocabulary WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vocabulary WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
