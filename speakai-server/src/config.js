export const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
export const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
export const LLM_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

export const STT_MODEL = 'paraformer-v2';
export const TTS_MODEL = 'cosyvoice-v2';
export const TTS_VOICE = 'longxiaochun_v2';
export const LLM_MODEL = 'qwen-turbo';

// Alibaba Cloud OSS — used to host audio files for paraformer-v2 file transcription
export const OSS_ACCESS_KEY_ID     = process.env.OSS_ACCESS_KEY_ID     || '';
export const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || '';
export const OSS_BUCKET            = process.env.OSS_BUCKET            || 'ink-app';
export const OSS_REGION            = process.env.OSS_REGION            || 'ap-southeast-1'; // Singapore
export const OSS_ENDPOINT          = `https://${OSS_BUCKET}.oss-${OSS_REGION}.aliyuncs.com`;

// DashScope STT REST endpoint (paraformer-v2 file transcription)
export const STT_SUBMIT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription';

if (!DASHSCOPE_API_KEY) console.warn('[config] DASHSCOPE_API_KEY not set');
if (!OSS_ACCESS_KEY_ID) console.warn('[config] OSS_ACCESS_KEY_ID not set');
