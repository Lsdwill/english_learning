/**
 * POST /summarize
 * Body: { text: string }  — first user message of the session
 * Response: { title: string }  — 3-5 word summary
 */
import { Router } from 'express';
import { DASHSCOPE_API_KEY, LLM_URL, LLM_MODEL } from '../config.js';

const router = Router();

router.post('/', async (req, res) => {
  const { text } = req.body;
  console.log('[summarize] request:', text?.slice(0, 60));
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const upstream = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are given one or more sentences spoken by a user in an English practice session. Generate a short conversation title of 3-6 words that captures the main topic. Reply with ONLY the title, no punctuation, no quotes, no explanation.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 20,
      }),
    });

    if (!upstream.ok) throw new Error(`LLM error ${upstream.status}`);
    const data = await upstream.json();
    const title = data.choices?.[0]?.message?.content?.trim() ?? text.slice(0, 40);
    console.log('[summarize] generated title:', title);
    res.json({ title });
  } catch (e) {
    console.warn('[summarize] error:', e.message);
    res.json({ title: text.slice(0, 40) });
  }
});

export default router;
