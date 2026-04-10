import axios from 'axios';
import 'dotenv/config';

const PRESAGE_BIOMARKER_WEIGHTS = {
  vocal_tension:     0.30,
  speech_rate_delta: 0.25,
  pitch_variability: 0.20,
  pause_frequency:   0.15,
  energy_level:      0.10,
};

export async function getStressIndex(audioBase64, sessionId) {
  try {
    const { data } = await axios.post(
      'https://api.presagetechnologies.com/v1/analyze',
      {
        audio: audioBase64,
        format: 'pcm_16khz',
        session_id: sessionId,
        features: Object.keys(PRESAGE_BIOMARKER_WEIGHTS),
      },
      {
        headers: {
          'X-API-Key': process.env.PRESAGE_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    const raw = Object.entries(PRESAGE_BIOMARKER_WEIGHTS).reduce(
      (sum, [key, weight]) => sum + (data.biomarkers?.[key] ?? 0.5) * weight,
      0
    );

    const stressIndex = Math.round(raw * 100);
    const engagement = Math.round((1 - (data.biomarkers?.vocal_tension ?? 0.5)) * 100);

    return {
      stress_index: stressIndex,
      engagement,
      confidence: data.confidence ?? null,
      uncertain: (data.confidence ?? 1) < 0.6,
      biomarkers: data.biomarkers ?? {},
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('[Presage] Error:', err.message);

    // Return a neutral fallback so the pipeline doesn't break
    return {
      stress_index: 50,
      engagement: 50,
      confidence: null,
      uncertain: true,
      biomarkers: {},
      timestamp: Date.now(),
    };
  }
}
