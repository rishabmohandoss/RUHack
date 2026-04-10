import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

const SYSTEM_PROMPT = `You are the Empathy Engine, a real-time sales intelligence co-pilot.
You receive live call audio in small chunks.
You MUST respond with valid JSON only — no prose, no markdown, no explanation.

Your response schema (always return all three keys):
{
  "transcript_clean": "Cleaned, punctuated version of the raw audio",
  "objection_signal": {
    "detected": false,
    "type": "price|authority|timing|need|trust|none",
    "confidence": 0.0,
    "predicted_phrase": null,
    "rebuttal": null
  },
  "feynman": {
    "jargon_detected": false,
    "original_phrase": null,
    "eli5": null
  }
}

RULES:
1. Rebuttals MUST come from the <PLAYBOOK> context below. If no matching playbook content exists, set rebuttal to null — never invent one.
2. Never fabricate statistics, product claims, or customer testimonials.
3. Feynman simplifications apply ONLY to technical or financial jargon, not casual speech.
4. If objection confidence is below 0.4, set detected to false.
5. If audio is unclear or empty, return transcript_clean as empty string and detected as false.`;

export async function analyzeAudioChunk(audioBase64, playbookContext = '', callContext = {}) {
  const fullPrompt = buildPrompt(playbookContext, callContext);

  try {
    const result = await model.generateContent([
      fullPrompt,
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: audioBase64,
        },
      },
    ]);

    const raw = result.response.text().trim();

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.error('[Gemini] Error:', err.message);
    return {
      transcript_clean: '',
      objection_signal: {
        detected: false,
        type: 'none',
        confidence: 0,
        predicted_phrase: null,
        rebuttal: null,
      },
      feynman: {
        jargon_detected: false,
        original_phrase: null,
        eli5: null,
      },
    };
  }
}

function buildPrompt(playbookContext, callContext) {
  const { prospectName = 'Unknown', prospectRole = 'Unknown', company = 'Unknown', priorObjections = [] } = callContext;

  return `${SYSTEM_PROMPT}

<PLAYBOOK>
${playbookContext || 'No playbook loaded. Do not generate rebuttals.'}
</PLAYBOOK>

<CALL_CONTEXT>
Prospect: ${prospectName} | Role: ${prospectRole} | Company: ${company}
Prior objections this call: ${priorObjections.join(', ') || 'none'}
</CALL_CONTEXT>

Analyze the audio and respond with JSON only:`;
}
