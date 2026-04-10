export const db = null;

export async function testConnection() {
  console.log('[DB] Running in mock mode — no database connected');
  return true;
}
