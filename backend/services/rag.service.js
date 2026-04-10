export async function retrievePlaybookContext(transcriptChunk, orgId = null) {
  console.log('[RAG] Mock mode — returning hardcoded playbook context');
  return `PRICE OBJECTION: Surface cost of inaction. Ask what payroll errors cost them today.
TIMING OBJECTION: Ask what would need to be true for this to be the right time.
TRUST OBJECTION: Label the emotion first. Pause. Let them confirm.`;
}

export async function seedPlaybookChunk() {
  console.log('[RAG] Mock mode — skipping seed');
  return true;
}
