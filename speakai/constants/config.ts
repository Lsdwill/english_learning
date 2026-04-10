export const CONFIG = {
  apiKey: 'YOUR_NEW_API_KEY_HERE', // Replace with your new key after rotating
  // LLM - OpenAI-compatible
  llmUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  llmModel: 'qwen-turbo',
  // STT - Paraformer real-time WebSocket
  sttWsUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference',
  sttModel: 'paraformer-realtime-v2',
  // TTS - CosyVoice via proxy (optional), falls back to device native TTS
  // Set ttsProxyUrl to your proxy server, e.g. 'http://192.168.1.100:3000/tts'
  // Leave empty string to use device native TTS only
  ttsProxyUrl: '' as string,
  ttsModel: 'cosyvoice-v2',
  ttsVoice: 'longxiaochun_v2',
};
