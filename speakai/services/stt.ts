/**
 * Paraformer STT via DashScope WebSocket.
 *
 * React Native WebSocket doesn't support custom headers.
 * We pass the API key via Sec-WebSocket-Protocol subprotocol,
 * same approach as TTS. DashScope accepts "lm.v1.{apiKey}" as subprotocol.
 *
 * Flow: connect → run-task → wait task-started → send audio chunks → finish-task → get transcript
 */
import * as FileSystem from 'expo-file-system';
import { CONFIG } from '@/constants/config';

function generateTaskId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function transcribeAudio(localUri: string): Promise<string> {
  // Read the recorded audio file as base64
  const base64Audio = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to binary chunks (ArrayBuffer)
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Promise((resolve, reject) => {
    const taskId = generateTaskId();

    // Pass API key via Sec-WebSocket-Protocol — only custom header RN supports
    const ws = new WebSocket(
      CONFIG.sttWsUrl,
      [`lm.v1.${CONFIG.apiKey}`]
    );

    let finalText = '';
    let taskStarted = false;

    ws.onopen = () => {
      // Send run-task instruction
      ws.send(JSON.stringify({
        header: {
          action: 'run-task',
          task_id: taskId,
          streaming: 'duplex',
        },
        payload: {
          task_group: 'audio',
          task: 'asr',
          function: 'recognition',
          model: CONFIG.sttModel,
          parameters: {
            format: 'wav',
            sample_rate: 16000,
            language_hints: ['en'],
          },
          input: {},
        },
      }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        const event: string = msg?.header?.event ?? '';

        if (event === 'task-started') {
          taskStarted = true;
          // Send audio in 3200-byte chunks (100ms of 16kHz 16-bit mono PCM)
          const CHUNK = 3200;
          let offset = 0;
          const sendNextChunk = () => {
            if (offset >= bytes.length) {
              // All audio sent — send finish-task
              ws.send(JSON.stringify({
                header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
                payload: { input: {} },
              }));
              return;
            }
            const chunk = bytes.slice(offset, offset + CHUNK);
            ws.send(chunk.buffer);
            offset += CHUNK;
            setTimeout(sendNextChunk, 100);
          };
          sendNextChunk();
        }

        if (event === 'result-generated') {
          const text: string = msg?.payload?.output?.sentence?.text ?? '';
          const sentenceEnd: boolean = msg?.payload?.output?.sentence?.sentence_end ?? false;
          if (text) finalText = text; // keep updating with latest sentence
          // If sentence ended, accumulate
          if (sentenceEnd && text) finalText = text;
        }

        if (event === 'task-finished') {
          ws.close();
          resolve(finalText.trim());
        }

        if (event === 'task-failed') {
          ws.close();
          reject(new Error(msg?.header?.error_message ?? 'STT task failed'));
        }
      } catch (err) {
        reject(err);
      }
    };

    ws.onerror = (e) => {
      reject(new Error(`STT WebSocket error: ${JSON.stringify(e)}`));
    };

    ws.onclose = (e) => {
      if (!taskStarted) {
        reject(new Error(`STT connection closed before task started (code: ${e.code})`));
      }
    };
  });
}
