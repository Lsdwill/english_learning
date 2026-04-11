/**
 * POST /llm/reply   — AI conversation reply only
 * POST /llm/analyze — grammar + native analysis only
 * POST /llm         — combined (legacy, kept for compatibility)
 * Body: { text: string }
 */
import { Router } from 'express';
import { DASHSCOPE_API_KEY, LLM_URL, LLM_MODEL } from '../config.js';

const router = Router();

const REPLY_PROMPT = `You are a friendly English conversation partner. The user just said something.
Respond naturally in ONE short sentence. No analysis, just a natural reply.
Respond ONLY with this JSON (no markdown): { "ai_reply": "your reply here" }`;

const ANALYZE_PROMPT = `You are a strict English speaking coach. The user just said a sentence in English.
Analyze ONLY the user's sentence — do not respond to its content.
Respond ONLY with this JSON (no markdown):
{
  "grammar": "Analyze every grammatical issue. Check: tense, subject-verb agreement, articles (a/an/the), prepositions, word order, plurals, pronouns, redundant or missing words. List each problem explicitly, e.g.: '1. \"help me to improve\" — the \"to\" is unnecessary; say \"help me improve\". 2. ...' If no issues, say exactly: Correct!",
  "native": "Polish the sentence into natural, fluent English. Restructure if needed, choose better vocabulary, improve flow — but preserve the original meaning exactly. Give ONE polished version only, no explanation."
}`;

const COMBINED_PROMPT = `You are a strict English speaking coach. The user just said a sentence in English.
Respond ONLY with this JSON (no markdown):
{
  "grammar": "Analyze every grammatical issue. Check: tense, subject-verb agreement, articles (a/an/the), prepositions, word order, plurals, pronouns, redundant or missing words. List each problem explicitly. If no issues, say exactly: Correct!",
  "native": "Polish the sentence into natural, fluent English. ONE polished version only, no explanation.",
  "ai_reply": "As a conversation partner, respond to what the user said in one short natural sentence."
}`;

async function callLLM(systemPrompt, userText) {
  const upstream = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!upstream.ok) {
    const err = await upstream.text();
    throw new Error(`LLM upstream error ${upstream.status}: ${err}`);
  }
  const data = await upstream.json();
  return JSON.parse(data.choices[0].message.content);
}

// AI reply only — fast path
router.post('/reply', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const result = await callLLM(REPLY_PROMPT, text);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Grammar + native analysis only
router.post('/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const result = await callLLM(ANALYZE_PROMPT, text);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Combined (legacy)
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const result = await callLLM(COMBINED_PROMPT, text);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
