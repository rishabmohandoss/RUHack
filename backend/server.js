import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import 'dotenv/config';

import { testConnection } from './db.js';
import { processAudioChunk, initSession, endSession } from './pipeline.js';
import { generatePreFlightBriefing } from './services/briefing.service.js';
import { seedPlaybookChunk } from './services/rag.service.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: '*' });
await app.register(websocketPlugin);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  ts: Date.now(),
}));

// ─── Live audio stream ────────────────────────────────────────────────────────
app.get('/stream', { websocket: true }, (socket, req) => {
  const sessionId = crypto.randomUUID();
  const callContext = {
    prospectName: req.query.prospect || 'Unknown',
    prospectRole: req.query.role || 'Unknown',
    company: req.query.company || 'Unknown',
  };

  initSession(sessionId, callContext);
  console.log(`[WS] Session started: ${sessionId}`);

  // Send session ID to client immediately
  socket.send(JSON.stringify({ type: 'SESSION_INIT', session_id: sessionId }));

  socket.on('message', async (audioChunk) => {
    try {
      const result = await processAudioChunk(audioChunk, sessionId);
      socket.send(JSON.stringify({ type: 'CALL_UPDATE', ...result }));
    } catch (err) {
      console.error('[WS] Pipeline error:', err.message);
      socket.send(JSON.stringify({ type: 'ERROR', error: err.message, session_id: sessionId }));
    }
  });

  socket.on('close', () => {
    endSession(sessionId);
    console.log(`[WS] Session ended: ${sessionId}`);
  });

  socket.on('error', (err) => {
    console.error('[WS] Socket error:', err.message);
    endSession(sessionId);
  });
});

// ─── Pre-flight briefing ──────────────────────────────────────────────────────
app.post('/briefing', async (req, reply) => {
  try {
    const prospect = req.body;
    const audioBuffer = await generatePreFlightBriefing(prospect);

    reply
      .header('Content-Type', 'audio/mpeg')
      .header('Content-Length', audioBuffer.length)
      .send(audioBuffer);
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
});

// ─── Seed a playbook chunk ────────────────────────────────────────────────────
app.post('/playbook/seed', async (req, reply) => {
  try {
    const { content, sourceFile, chunkIndex, objectionType, orgId } = req.body;

    if (!content || !sourceFile || chunkIndex === undefined) {
      return reply.status(400).send({ error: 'content, sourceFile, and chunkIndex are required' });
    }

    const success = await seedPlaybookChunk(content, sourceFile, chunkIndex, objectionType, orgId);
    reply.send({ success, chunkIndex });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
await testConnection();
await app.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' });
console.log(`[Server] Running on ws://localhost:${process.env.PORT || 3001}`);
