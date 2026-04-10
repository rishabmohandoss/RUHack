/**
 * Quick test — run this while the server is running to verify the WebSocket works:
 * node backend/scripts/test-ws.js
 */

import 'dotenv/config';

const WS_URL = `ws://localhost:${process.env.PORT || 3001}/stream?prospect=John+Smith&role=VP+HR&company=Acme+Corp`;

async function testWebSocket() {
  console.log('[Test] Connecting to:', WS_URL);

  const { WebSocket } = await import('ws').catch(() => {
    console.error('[Test] Install ws: npm install ws');
    process.exit(1);
  });

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('[Test] Connected. Sending fake audio chunk...');
    // Send a fake buffer — the pipeline will handle gracefully
    ws.send(Buffer.alloc(1024, 0));
  });

  ws.on('message', (data) => {
    const parsed = JSON.parse(data.toString());
    console.log('[Test] Response received:');
    console.log(JSON.stringify(parsed, null, 2));

    if (parsed.type === 'CALL_UPDATE') {
      console.log('\n[Test] Pipeline working correctly.');
      ws.close();
      process.exit(0);
    }
  });

  ws.on('error', (err) => {
    console.error('[Test] WebSocket error:', err.message);
    console.error('[Test] Make sure the server is running: npm start');
    process.exit(1);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('[Test] Timeout — no response from server');
    process.exit(1);
  }, 10000);
}

testWebSocket();
