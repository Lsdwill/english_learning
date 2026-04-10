/**
 * POST /polish
 * Body: { text: string, mode: 'casual' | 'business' }
 * Response: { result: string, explanation: string }
 */
import { Router } from 'express';
import { DASHSCOPE_API_KEY, LLM_URL, LLM_MODEL } from '../config.js';

const router = Router();

const PROMPTS = {
  casual: `You are an expert English editor. The user wants to polish their sentence for everyday casual conversation.

Rules:
- Keep the meaning exactly the same
- Make it sound natural and friendly, like something a native speaker would say to a friend
- You may restructure the sentence, use contractions, idioms, or informal phrasing
- Avoid overly formal or stiff language

Respond ONLY with JSON (no markdown):
{
  "result": "The polished casual version",
  "explanation": "Brief note on what changed and why (1-2 sentences)"
}`,

  business: `You are an expert English editor. The user wants to polish their sentence for professional business communication.

Rules:
- Keep the meaning exactly the same
- Make it sound professional, clear, and confident
- Use formal vocabulary, avoid contractions and slang
- Restructure if needed for clarity and impact

Respond ONLY with JSON (no markdown):
{
  "result": "The polished business version",
  "explanation": "Brief note on what changed and why (1-2 sentences)"
}`,
};

router.post('/', async (req, res) => {
  const { text, mode = 'casual' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const prompt = PROMPTS[mode] ?? PROMPTS.casual;

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
          { role: 'system', content: prompt },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: err });
    }

    const data = await upstream.json();
    const result = JSON.parse(data.choices[0].message.content);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
