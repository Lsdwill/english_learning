import { Router } from 'express';
import WebSocket from 'ws';
import { DASHSCOPE_API_KEY, WS_URL, TTS_MODEL, TTS_VOICE } from '../config.js';

const router = Router();

function generateTaskId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

router.get('/', async (req, res) => {
  req.body = { text: req.query.text };
  handleTTS(req, res);
});

router.post('/', async (req, res) => {
  handleTTS(req, res);
});

async function handleTTS(req, res) {
  const { text, voice = TTS_VOICE, model = TTS_MODEL } = req.body;

  console.log('[TTS] ▶ request received:', { text: text?.slice(0, 60), voice, model });
  console.log('[TTS] API key set:', !!DASHSCOPE_API_KEY, '| WS_URL:', WS_URL);

  if (!text) return res.status(400).json({ error: 'text is required' });

  const taskId = generateTaskId();
  const chunks = [];
  let taskStarted = false;
  let settled = false;

  const settle = (fn) => {
    if (settled) return;
    settled = true;
    try { ws.terminate(); } catch (_) {}
    fn();
  };

  console.log('[TTS] opening WebSocket...');
  const ws = new WebSocket(WS_URL, {
    headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
  });

  ws.on('open', () => {
    console.log('[TTS] ✓ WS open — sending run-task');
    ws.send(JSON.stringify({
      header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
      payload: {
        task_group: 'audio',
        task: 'tts',
        function: 'SpeechSynthesizer',
        model,
        parameters: { voice, format: 'mp3', sample_rate: 22050 },
        input: {},
      },
    }));
  });

  ws.on('message', (data) => {
    // Binary frame = raw audio
    if (Buffer.isBuffer(data) && data[0] !== 0x7b) {
      console.log('[TTS] binary audio chunk:', data.length, 'bytes');
      chunks.push(data);
      return;
    }

    let msg;
    try { msg = JSON.parse(data.toString()); } catch (e) {
      console.log('[TTS] non-JSON message:', data.toString().slice(0, 100));
      return;
    }

    const event = msg?.header?.event;
    console.log('[TTS] event:', event, '| full msg:', JSON.stringify(msg).slice(0, 400));

    if (event === 'task-started') {
      taskStarted = true;
      console.log('[TTS] task started — sending text');
      ws.send(JSON.stringify({
        header: { action: 'continue-task', task_id: taskId },
        payload: { input: { text } },
      }));
      ws.send(JSON.stringify({
        header: { action: 'finish-task', task_id: taskId },
        payload: { input: {} },
      }));
    }

    if (event === 'result-generated') {
      const audio = msg?.payload?.output?.audio;
      console.log('[TTS] result-generated | audio type:', typeof audio, 'len:', audio?.length ?? 0);
      if (audio) chunks.push(Buffer.from(audio, 'base64'));
    }

    if (event === 'task-finished') {
      console.log('[TTS] task finished | chunks:', chunks.length, 'total bytes:', chunks.reduce((s, c) => s + c.length, 0));
      settle(() => {
        if (chunks.length === 0) return res.status(500).json({ error: 'TTS: no audio received' });
        const mp3 = Buffer.concat(chunks);
        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Length', String(mp3.length));
        res.send(mp3);
      });
    }

    if (event === 'task-failed') {
      const errMsg = msg?.header?.error_message ?? 'TTS task failed';
      console.error('[TTS] task-failed:', errMsg);
      settle(() => res.status(500).json({ error: errMsg }));
    }
  });

  ws.on('error', (e) => {
    console.error('[TTS] ✗ WS error:', e.message);
    settle(() => res.status(500).json({ error: `WebSocket error: ${e.message}` }));
  });

  ws.on('close', (code, reason) => {
    console.log('[TTS] WS closed | code:', code, 'reason:', reason?.toString(), '| taskStarted:', taskStarted, 'settled:', settled);
    if (!taskStarted && !settled) {
      settle(() => res.status(500).json({ error: `WS closed before task started (code: ${code})` }));
    }
  });
}

export default router;
