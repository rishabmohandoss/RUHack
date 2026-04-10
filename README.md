# Empathy Engine — Backend

## Setup

1. Install dependencies
npm install

2. Copy env file and fill in your keys
cp .env.example .env

3. Run the SQL schema in Supabase SQL Editor (see schema.sql)

4. Seed the playbook
node backend/scripts/seed-playbook.js

5. Start the server
npm start

6. Test the WebSocket (in a second terminal)
npm install ws
node backend/scripts/test-ws.js

## File structure

backend/
  server.js              — Fastify server, WebSocket endpoint, REST routes
  db.js                  — Supabase + pg connection pool
  pipeline.js            — Parallel Gemini + Presage processing
  services/
    gemini.service.js    — Transcription, objection detection, Feynman
    presage.service.js   — Voice stress analysis → 0-100 stress index
    rag.service.js       — pgvector playbook retrieval + chunk seeding
    briefing.service.js  — ElevenLabs pre-flight audio generation
  scripts/
    seed-playbook.js     — One-time script to embed playbook into Supabase
    test-ws.js           — WebSocket smoke test

## Endpoints

WebSocket  ws://localhost:3001/stream?prospect=Name&role=Title&company=Corp
POST       /briefing        — body: prospect object → returns audio/mpeg
POST       /playbook/seed   — body: { content, sourceFile, chunkIndex }
GET        /health          — returns { status: ok, ts: timestamp }
