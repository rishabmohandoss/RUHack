import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function generatePreFlightBriefing(prospect) {
  try {
    const script = await generateBriefingScript(prospect);
    console.log('[ElevenLabs] Script generated:', script);

    const response = await axios.post(
      'https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB',
      {
        text: script,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.2,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );

    return Buffer.from(response.data);
  } catch (err) {
    console.error('[ElevenLabs] Error:', err.message);
    throw err;
  }
}

async function generateBriefingScript(prospect) {
  const {
    name = 'the prospect',
    title = 'decision maker',
    company = 'their company',
    employees = 'unknown size',
    painPoints = [],
    priorNotes = 'No prior interactions.',
  } = prospect;

  const prompt = `Write a 70-word spoken pre-call briefing for a sales rep.
Tone: confident, calm, like a trusted colleague whispering key facts.
No bullet points. Spoken prose only. End with ONE tactical tip.

Prospect: ${name}, ${title} at ${company}
Company size: ${employees} employees
Known pain points: ${painPoints.join(', ') || 'unknown'}
Prior interactions: ${priorNotes}

70 words maximum. Do not exceed this. Return only the script text, nothing else.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
