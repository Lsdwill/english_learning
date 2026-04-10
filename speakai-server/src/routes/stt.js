/**
 * POST /stt
 * Body: multipart/form-data, field "audio"
 * Response: { transcript, oss_key }
 *
 * Audio is kept on OSS for 90 days (cleanup job handles deletion).
 * oss_key is returned so the caller can save it to the messages table for replay.
 */
import { Router } from 'express';
import multer from 'multer';
import OSS from 'ali-oss';
import {
  DASHSCOPE_API_KEY, STT_SUBMIT_URL,
  OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION,
} from '../config.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const ossClient = new OSS({
  region: `oss-${OSS_REGION}`,
  accessKeyId: OSS_ACCESS_KEY_ID,
  accessKeySecret: OSS_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET,
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

router.post('/', upload.single('audio'), async (req, res) => {
  console.log('[STT] ▶ received file:', req.file?.originalname, 'size:', req.file?.size);
  if (!req.file) return res.status(400).json({ error: 'audio file is required' });

  const ossKey = `speakai-recordings/${Date.now()}-${req.file.originalname}`;

  try {
    // 1. Upload to OSS (kept for 90 days, not deleted after transcription)
    await ossClient.put(ossKey, req.file.buffer, {
      headers: { 'Content-Type': req.file.mimetype || 'audio/m4a' },
    });
    const fileUrl = ossClient.signatureUrl(ossKey, { expires: 3600 });
    console.log('[STT] uploaded, signed URL generated');

    // 2. Submit transcription task
    const submitRes = await fetch(STT_SUBMIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'paraformer-v2',
        input: { file_urls: [fileUrl] },
        parameters: { language_hints: ['en'] },
      }),
    });

    const submitData = await submitRes.json();
    if (!submitRes.ok) throw new Error(`Submit failed: ${submitData.message || submitRes.status}`);

    const taskId = submitData?.output?.task_id;
    if (!taskId) throw new Error('No task_id returned');
    console.log('[STT] task_id:', taskId);

    // 3. Poll for result
    let transcript = '';
    for (let i = 0; i < 60; i++) {
      await sleep(2000);
      const pollRes = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` } }
      );
      const pollData = await pollRes.json();
      const status = pollData?.output?.task_status;
      console.log(`[STT] poll #${i + 1} status:`, status);

      if (status === 'SUCCEEDED') {
        const results = pollData?.output?.results ?? [];
        if (results[0]?.subtask_status !== 'SUCCEEDED') {
          throw new Error(`Subtask failed: ${results[0]?.message}`);
        }
        const transcriptRes = await fetch(results[0].transcription_url);
        const transcriptData = await transcriptRes.json();
        const sentences = transcriptData?.transcripts?.[0]?.sentences ?? [];
        transcript = sentences.map(s => s.text).join(' ').trim();
        console.log('[STT] transcript:', transcript);
        break;
      }

      if (status === 'FAILED') {
        throw new Error(`Task failed: ${pollData?.output?.message}`);
      }
    }

    // Return transcript + oss_key + signed URL for immediate replay
    const ossSignedUrl = ossClient.signatureUrl(ossKey, { expires: 365 * 24 * 3600 })
      .replace(/^http:\/\//, 'https://'); // force HTTPS
    console.log('[STT] oss_url prefix:', ossSignedUrl.slice(0, 80));
    res.json({ transcript, oss_key: ossKey, oss_url: ossSignedUrl });
  } catch (e) {
    console.error('[STT] error:', e.message);
    // On error, clean up the file since it won't be referenced
    try { await ossClient.delete(ossKey); } catch (_) {}
    res.status(500).json({ error: e.message });
  }
});

export default router;
