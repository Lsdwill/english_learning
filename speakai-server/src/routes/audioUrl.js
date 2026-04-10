/**
 * GET /audio-url?key=<oss_key>
 * Returns a short-lived signed URL for replaying a stored audio file.
 */
import { Router } from 'express';
import OSS from 'ali-oss';
import { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION } from '../config.js';

const router = Router();

const ossClient = new OSS({
  region: `oss-${OSS_REGION}`,
  accessKeyId: OSS_ACCESS_KEY_ID,
  accessKeySecret: OSS_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET,
});

router.get('/', (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    const url = ossClient.signatureUrl(key, { expires: 300 }); // 5 min
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
