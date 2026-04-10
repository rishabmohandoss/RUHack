/**
 * Run this once to seed your playbook into Supabase:
 * node backend/scripts/seed-playbook.js
 *
 * Put your playbook content in the PLAYBOOK_TEXT constant below,
 * or modify the script to read from a file.
 */

import { seedPlaybookChunk } from '../services/rag.service.js';
import 'dotenv/config';

const CHUNK_SIZE = 400; // characters per chunk — tweak as needed

const PLAYBOOK_TEXT = `
PRICE OBJECTION — "It's too expensive"
When a prospect says the price is too high, do not immediately discount.
Instead, surface the cost of inaction. Ask: "What does it cost you today when payroll errors occur?"
Help them calculate the gap. A $50,000 annual error rate makes a $10,000 solution look cheap.
Always tie value to their specific pain point, not to product features.

TIMING OBJECTION — "Now isn't the right time"
Never say "I understand you're busy." That validates the objection without progress.
Instead say: "That makes sense — what would need to be true for this to be the right time?"
This surfaces the real blocker. Common hidden blockers: budget cycle, internal champion not ready, fear of change.
Follow up with: "If we could solve [specific pain point] by Q1, would that change things?"

AUTHORITY OBJECTION — "I need to run this by my boss"
This is usually not an authority issue — it's a trust or value issue in disguise.
Ask: "Of course. When you present this internally, what questions do you anticipate?"
This does two things: positions you as a partner, and lets you arm them with answers.
Never ask to "get in front of" their boss directly — it signals distrust.

NEED OBJECTION — "We're happy with our current solution"
This is the hardest objection. The prospect doesn't feel pain yet.
Use SPIN: ask Situation questions first, then Problem questions, then Implication.
"Walk me through how you handle payroll reconciliation today."
"How long does that typically take your team?"
"What happens when there's a discrepancy?"
Let them talk themselves into feeling the pain.

TRUST OBJECTION — "We've had bad experiences with vendors like you"
Label the emotion first. "It sounds like you've been let down before."
Pause. Let them confirm. Do not immediately defend your company.
Then: "What would a vendor need to do differently for you to feel confident this time?"
This makes them design the solution, which they will then believe in.
`;

async function seedPlaybook() {
  console.log('[Seeder] Starting playbook seed...');

  const chunks = chunkText(PLAYBOOK_TEXT, CHUNK_SIZE);
  console.log(`[Seeder] Splitting into ${chunks.length} chunks`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const objectionType = detectObjectionType(chunk);

    const success = await seedPlaybookChunk(
      chunk,
      'sales-playbook-v1.txt',
      i,
      objectionType,
      null
    );

    if (success) {
      console.log(`[Seeder] ✓ Chunk ${i + 1}/${chunks.length} — type: ${objectionType}`);
    } else {
      console.error(`[Seeder] ✗ Failed on chunk ${i}`);
    }

    // Small delay to avoid rate limiting on the embedding API
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('[Seeder] Done. All chunks seeded into Supabase.');
  process.exit(0);
}

function chunkText(text, size) {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 20);
  const chunks = [];

  for (const para of paragraphs) {
    if (para.length <= size) {
      chunks.push(para.trim());
    } else {
      // Split long paragraphs into smaller pieces
      for (let i = 0; i < para.length; i += size) {
        const slice = para.slice(i, i + size).trim();
        if (slice.length > 20) chunks.push(slice);
      }
    }
  }

  return chunks;
}

function detectObjectionType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('price') || lower.includes('expensive') || lower.includes('cost')) return 'price';
  if (lower.includes('timing') || lower.includes('right time') || lower.includes('busy')) return 'timing';
  if (lower.includes('authority') || lower.includes('boss') || lower.includes('run this by')) return 'authority';
  if (lower.includes('need') || lower.includes('happy with') || lower.includes('current solution')) return 'need';
  if (lower.includes('trust') || lower.includes('bad experience') || lower.includes('vendor')) return 'trust';
  return null;
}

seedPlaybook();
