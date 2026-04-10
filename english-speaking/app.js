// ===== SpeakAI — minimal demo wiring =====
// Replace API_KEY and endpoints with your actual providers.

const CONFIG = {
  // OpenAI-compatible LLM endpoint
  llmUrl: 'https://api.openai.com/v1/chat/completions',
  llmModel: 'gpt-4o',
  // TTS endpoint (OpenAI TTS or compatible)
  ttsUrl: 'https://api.openai.com/v1/audio/speech',
  ttsVoice: 'nova',
  // STT — browser Web Speech API used by default (no key needed)
  apiKey: 'YOUR_API_KEY_HERE',
};

const SYSTEM_PROMPT = `You are an English speaking coach.
The user speaks English. Respond with a JSON object:
{
  "ai_reply": "One short English sentence to continue the conversation",
  "grammar": "Brief grammar feedback on the user's input (say 'Correct!' if fine)",
  "native": "A more natural/idiomatic English version of what the user said"
}
Keep everything concise. ai_reply should be one sentence only.`;

// ===== DOM refs =====
const chatArea  = document.getElementById('chatArea');
const micBtn    = document.getElementById('micBtn');
const waveform  = document.getElementById('waveform');
const inputHint = document.getElementById('inputHint');

// ===== Speech Recognition =====
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    stopRecording();
    handleUserInput(transcript);
  };

  recognition.onerror = () => stopRecording();
  recognition.onend   = () => { if (isRecording) stopRecording(); };
}

micBtn.addEventListener('click', () => {
  if (!recognition) { alert('Browser does not support speech recognition.'); return; }
  isRecording ? stopRecording() : startRecording();
});

async function startRecording() {
  isRecording = true;
  micBtn.classList.add('recording');
  waveform.classList.add('active');
  inputHint.textContent = 'Listening… tap to stop';

  // Start MediaRecorder to capture audio for replay
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      lastAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
  } catch (_) { mediaRecorder = null; }

  recognition.start();
}

function stopRecording() {
  isRecording = false;
  micBtn.classList.remove('recording');
  waveform.classList.remove('active');
  inputHint.textContent = 'Press and hold to speak';
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  try { recognition.stop(); } catch (_) {}
}

// ===== Main flow =====
async function handleUserInput(text) {
  appendUserMessage(text);
  const thinkingEl = appendThinking();

  try {
    const result = await callLLM(text);
    thinkingEl.remove();
    appendAIMessage(result);
    speakText(result.ai_reply);
  } catch (err) {
    thinkingEl.remove();
    appendError(err.message);
  }
}

// ===== LLM call =====
async function callLLM(userText) {
  const res = await fetch(CONFIG.llmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.llmModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userText },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`LLM error ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// ===== TTS =====
async function speakText(text) {
  if (CONFIG.apiKey === 'YOUR_API_KEY_HERE') return; // skip in demo mode

  try {
    const res = await fetch(CONFIG.ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`,
      },
      body: JSON.stringify({ model: 'tts-1', voice: CONFIG.ttsVoice, input: text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    new Audio(URL.createObjectURL(blob)).play();
  } catch (_) {}
}

// ===== DOM helpers =====
// Store last recording blob for replay
let lastAudioBlob = null;

function appendUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'message user-message';
  el.innerHTML = `
    <div class="message-body">
      <div class="speech-bubble">
        <div class="speech-col">
          <div class="user-speech-line">${text}</div>
        </div>
        <button class="tts-btn replay-btn" title="Play original" onclick="replayUserAudio(this)">🔊</button>
      </div>
    </div>`;
  const btn = el.querySelector('.replay-btn');
  btn._audioBlob = lastAudioBlob;
  chatArea.appendChild(el);
  scrollBottom();
}

function replayUserAudio(btn) {
  if (btn._audioBlob) {
    new Audio(URL.createObjectURL(btn._audioBlob)).play();
  }
}

function appendAIMessage({ ai_reply, grammar, native }) {
  // Feedback bubble
  const el = document.createElement('div');
  el.className = 'message user-message';
  el.innerHTML = `
    <div class="message-body">
      <div class="message-feedback">
        <div class="feedback-item correction">
          <span class="feedback-icon">✦</span>
          <strong>Grammar:</strong> ${grammar}
        </div>
        <div class="feedback-item native">
          <span class="feedback-icon">◆</span>
          <strong>More natural:</strong> ${native}
          <button class="tts-btn small" onclick="speakText('${native.replace(/'/g, "\\'")}')">🔊</button>
        </div>
      </div>
    </div>`;
  chatArea.appendChild(el);

  // AI reply bubble
  const aiEl = document.createElement('div');
  aiEl.className = 'message ai-message';
  aiEl.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-body">
      <div class="ai-bubble">
        <div class="message-text">${ai_reply}</div>
        <button class="tts-btn replay-btn" onclick="speakText('${ai_reply.replace(/'/g, "\\'")}')">🔊</button>
      </div>
    </div>`;
  chatArea.appendChild(aiEl);
  scrollBottom();
}

function appendThinking() {
  const el = document.createElement('div');
  el.className = 'message ai-message';
  el.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-body">
      <div class="message-text" style="color:var(--text-muted)">Thinking…</div>
    </div>`;
  chatArea.appendChild(el);
  scrollBottom();
  return el;
}

function appendError(msg) {
  const el = document.createElement('div');
  el.className = 'message ai-message';
  el.innerHTML = `<div class="message-body"><div class="message-text" style="color:#ff6b6b">Error: ${msg}</div></div>`;
  chatArea.appendChild(el);
  scrollBottom();
}

function scrollBottom() {
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}
