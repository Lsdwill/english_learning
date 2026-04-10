/**
 * POST /llm
 * Body: { text: string }
 * Response: { ai_reply, grammar, native }
 */
import { Router } from 'express';
import { DASHSCOPE_API_KEY, LLM_URL, LLM_MODEL } from '../config.js';

const router = Router();

const SYSTEM_PROMPT = `You are a strict English speaking coach. The user just said a sentence in English.

Your job is to analyze ONLY the user's sentence — not respond to its content.

Respond ONLY with this JSON (no markdown):
{
  "grammar": "Analyze every grammatical issue in the user's sentence. Check: tense, subject-verb agreement, articles (a/an/the), prepositions, word order, plurals, pronouns, redundant or missing words. List each problem explicitly, e.g.: '1. \"help me to improve\" — the \"to\" is unnecessary; say \"help me improve\". 2. ...' If there are no issues at all, say exactly: Correct!",
  "native": "Polish the user's sentence into natural, fluent English. You may restructure the sentence, choose better vocabulary, and improve flow — but preserve the original meaning exactly. Give ONE polished version only, no explanation.",
  "ai_reply": "Now, as a conversation partner, respond to what the user said in one short natural sentence."
}`;

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

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
          { role: 'system', content: SYSTEM_PROMPT },
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
