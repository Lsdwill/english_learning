import { CONFIG } from '@/constants/config';

export interface LLMResult {
  ai_reply: string;
  grammar: string;
  native: string;
}

const SYSTEM_PROMPT = `You are an English speaking coach.
The user speaks English. Respond ONLY with a JSON object (no markdown):
{
  "ai_reply": "One short English sentence to continue the conversation",
  "grammar": "Brief grammar feedback on the user's input (say 'Correct!' if fine)",
  "native": "A more natural/idiomatic English version of what the user said"
}`;

export async function callLLM(userText: string): Promise<LLMResult> {
  const res = await fetch(CONFIG.llmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.llmModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`LLM error ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as LLMResult;
}
