import { analyzeAudioChunk } from './services/gemini.service.js';
import { getStressIndex } from './services/presage.service.js';
import { retrievePlaybookContext } from './services/rag.service.js';

// Session state stored in memory per active call
const sessionState = new Map();

export function initSession(sessionId, callContext = {}) {
  sessionState.set(sessionId, {
    callContext,
    priorObjections: [],
    transcriptBuffer: '',
    chunkCount: 0,
  });
}

export function endSession(sessionId) {
  sessionState.delete(sessionId);
}

export async function processAudioChunk(audioChunk, sessionId) {
  const state = sessionState.get(sessionId) || { callContext: {}, priorObjections: [], transcriptBuffer: '', chunkCount: 0 };
  state.chunkCount++;

  const audioBase64 = audioChunk.toString('base64');

  // Retrieve playbook context every 5 chunks (not every chunk — saves latency)
  let playbookContext = '';
  if (state.chunkCount % 5 === 1 && state.transcriptBuffer.length > 20) {
    playbookContext = await retrievePlaybookContext(state.transcriptBuffer.slice(-500));
  }

  // Run Gemini and Presage in parallel — never await sequentially
  const [geminiResult, presageResult] = await Promise.allSettled([
    analyzeAudioChunk(audioBase64, playbookContext, {
      ...state.callContext,
      priorObjections: state.priorObjections,
    }),
    getStressIndex(audioBase64, sessionId),
  ]);

  const intelligence = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
  const vitals = presageResult.status === 'fulfilled' ? presageResult.value : null;

  // Update session state with new transcript and detected objections
  if (intelligence?.transcript_clean) {
    state.transcriptBuffer += ' ' + intelligence.transcript_clean;
    // Keep buffer at max 2000 chars
    if (state.transcriptBuffer.length > 2000) {
      state.transcriptBuffer = state.transcriptBuffer.slice(-2000);
    }
  }

  if (intelligence?.objection_signal?.detected && intelligence.objection_signal.type !== 'none') {
    if (!state.priorObjections.includes(intelligence.objection_signal.type)) {
      state.priorObjections.push(intelligence.objection_signal.type);
    }
  }

  sessionState.set(sessionId, state);

  return {
    session_id: sessionId,
    chunk: state.chunkCount,
    intelligence,
    vitals,
    ts: Date.now(),
  };
}
