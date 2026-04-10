import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import ttsRouter from './routes/tts.js';
import sttRouter from './routes/stt.js';
import llmRouter from './routes/llm.js';
import sessionsRouter from './routes/sessions.js';
import messagesRouter from './routes/messages.js';
import favoritesRouter from './routes/favorites.js';
import audioUrlRouter from './routes/audioUrl.js';
import summarizeRouter from './routes/summarize.js';
import polishRouter from './routes/polish.js';
import { startCleanupJob } from './jobs/cleanupAudio.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/tts', ttsRouter);
app.use('/stt', sttRouter);
app.use('/llm', llmRouter);
app.use('/sessions', sessionsRouter);
app.use('/messages', messagesRouter);
app.use('/favorites', favoritesRouter);
app.use('/audio-url', audioUrlRouter);
app.use('/summarize', summarizeRouter);
app.use('/polish', polishRouter);

app.listen(PORT, () => {
  console.log(`SpeakAI server running on http://0.0.0.0:${PORT}`);
  startCleanupJob();
});
