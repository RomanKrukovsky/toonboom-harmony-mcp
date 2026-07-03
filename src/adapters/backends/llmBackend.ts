import { config } from '../../config.js';

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface LlmResult {
  status: 'success' | 'error' | 'placeholder';
  origin: 'real' | 'placeholder';
  dialogue: DialogueLine[];
  error?: string;
}

/**
 * Generate scene dialogue from a creative brief using a configured LLM backend.
 * Honors HARMONY_BACKEND_LLM / OPENAI_API_KEY / ANTHROPIC_API_KEY feature flags.
 * Falls back to deterministic placeholder lines when no backend is enabled.
 */
export async function generateDialogue(
  prompt: string,
  characters: string[],
  context?: { location?: string; mood?: string; durationFrames?: number; fps?: number }
): Promise<LlmResult> {
  const backend = config.backends.llm;

  if (backend === 'none' || backend === 'mock') {
    return deterministicDialogue(prompt, characters, context);
  }

  if (backend === 'openai') {
    const key = config.backends.apiKeys.openai;
    if (!key) {
      return { status: 'error', origin: 'placeholder', dialogue: [], error: 'OpenAI API key not configured (OPENAI_API_KEY)' };
    }

    try {
      const fetch = (globalThis as any).fetch;
      const systemMessage = `You are a screenwriter for animated series. Return ONLY a JSON array of dialogue lines. Each item must be {"speaker": "...", "text": "..."}. No markdown, no explanation.`;
      const userMessage = buildPrompt(prompt, characters, context);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content || '';
      const parsed = parseJsonDialogue(content);
      return { status: 'success', origin: 'real', dialogue: parsed };
    } catch (e: any) {
      return { status: 'error', origin: 'placeholder', dialogue: deterministicDialogue(prompt, characters, context).dialogue, error: e.message };
    }
  }

  if (backend === 'anthropic') {
    const key = config.backends.apiKeys.anthropic;
    if (!key) {
      return { status: 'error', origin: 'placeholder', dialogue: [], error: 'Anthropic API key not configured (ANTHROPIC_API_KEY)' };
    }
    // Anthropic path is reserved; fallback to deterministic for now.
    return deterministicDialogue(prompt, characters, context);
  }

  return deterministicDialogue(prompt, characters, context);
}

function buildPrompt(prompt: string, characters: string[], context?: any): string {
  const parts = [
    `Write 2-5 lines of dialogue for an animated scene.`,
    `Scene premise: ${prompt}`,
    `Characters: ${characters.join(', ')}.`,
    context?.location ? `Location: ${context.location}.` : '',
    context?.mood ? `Mood: ${context.mood}.` : ''
  ];
  return parts.filter(Boolean).join('\n');
}

function parseJsonDialogue(content: string): DialogueLine[] {
  try {
    const cleaned = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: any) => item && typeof item.speaker === 'string' && typeof item.text === 'string')
        .map((item: any) => ({ speaker: item.speaker, text: item.text }));
    }
  } catch {
    // ignore
  }
  return [];
}

function deterministicDialogue(
  prompt: string,
  characters: string[],
  context?: any
): LlmResult {
  const lines: DialogueLine[] = [];
  const main = characters[0] || 'Character';
  const second = characters[1];

  lines.push({ speaker: main, text: `So this is the situation: ${prompt.slice(0, 60)}...` });
  if (second) {
    lines.push({ speaker: second, text: 'What do we do now?' });
    lines.push({ speaker: main, text: 'We move forward — carefully.' });
  } else {
    lines.push({ speaker: main, text: 'I need to figure this out.' });
  }

  return { status: 'success', origin: 'placeholder', dialogue: lines };
}
