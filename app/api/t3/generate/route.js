/**
 * T3 Metasystem Integration Route
 * POST /api/t3/generate
 *
 * Bridges T3 Metasystem MCP content atoms to the MuAPI generation pipeline.
 * Accepts a SpandiLand content atom spec (character, hook, platform)
 * and returns the generated media_url for storage back into T3 Metasystem.
 *
 * Auth: x-muapi-key or x-api-key header, or muapi_key cookie
 */

import { NextResponse } from 'next/server';
import { safeJson } from '../../../lib/safeJson.js';

const MUAPI_BASE = 'https://api.muapi.ai';

const CHARACTER_MODIFIERS = {
  microdjimz:    'Afro-Surrealist protagonist wordsmith poet, muted purple knitted texture aesthetic, gold accents, mystical urban energy',
  bamba:         'Afro-Surrealist mystic figure, deep spiritual presence, indigo violet tones, felt texture, ethereal atmosphere',
  gwincha:       'Afro-Surrealist rebel character, dynamic pose, bold energy, dark void background with electric accents',
  'skylar-nini': 'Afro-Surrealist visionary, futuristic elements, muted blue-purple palette, gold highlights, dreamlike quality',
  jinga:         'Afro-Surrealist protector figure, powerful and grounded, earth tones with purple accents, guardian presence',
  salpz:         'Afro-Surrealist adversary, sharp contrasting elements, tension in composition, deep shadow aesthetic',
  dolphia:       'Aqua Realm character, fluid oceanic movement, teal and deep blue palette, surreal underwater world',
  fanfa:         'Aqua Realm spirit, luminescent quality, water-light refraction, mystical deep-sea aesthetic',
  dale:          'Aqua Realm explorer, adventurous energy, coral and ocean palette, Afro-Surrealist underwater world',
};

const PLATFORM_AR = {
  tiktok: '9:16',
  ig: '4:5',
  yt: '16:9',
  fb: '4:3',
  default: '1:1',
};

function getApiKey(request) {
  return request.headers.get('x-muapi-key')
    || request.headers.get('x-api-key')
    || request.cookies.get('muapi_key')?.value;
}

async function pollResult(requestId, apiKey, maxAttempts = 60, interval = 2000) {
  const pollUrl = `${MUAPI_BASE}/api/v1/predictions/${requestId}/result`;
  let backoff = interval;
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise(r => setTimeout(r, backoff));
    const res = await fetch(pollUrl, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    });
    if (res.status >= 500) { backoff = Math.min(backoff * 1.5, 8000); continue; }
    backoff = interval;
    const data = await res.json();
    const status = data.status?.toLowerCase();
    if (['completed', 'succeeded', 'success'].includes(status)) return data;
    if (['failed', 'error'].includes(status)) throw new Error(data.error || 'Generation failed');
  }
  throw new Error('Generation timed out');
}

export async function POST(request) {
  const apiKey = getApiKey(request);
  if (!apiKey) return NextResponse.json({ error: 'Missing MuAPI key (x-muapi-key header)' }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const {
    character,
    hook,
    platform = 'tiktok',
    model = 'flux-dev-image',
    prompt_override,
  } = body;

  if (!character && !prompt_override) {
    return NextResponse.json({ error: 'character or prompt_override required' }, { status: 400 });
  }

  const charMod = CHARACTER_MODIFIERS[character?.toLowerCase()] || '';
  const ar = PLATFORM_AR[platform] || PLATFORM_AR.default;
  const finalPrompt = prompt_override || [
    hook,
    charMod,
    'SpandiLand universe, Afro-Surrealist, knitted felt 3D aesthetic, palette #4A3F6B #2E2A4A #C9A84C',
  ].filter(Boolean).join('. ');

  try {
    const submitRes = await fetch(`${MUAPI_BASE}/api/v1/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ prompt: finalPrompt, aspect_ratio: ar }),
    });

    const submitData = await safeJson(submitRes);
    if (!submitRes.ok) {
      return NextResponse.json({ error: 'MuAPI submit failed', detail: submitData }, { status: submitRes.status });
    }

    const requestId = submitData.request_id || submitData.id;
    if (!requestId) {
      const mediaUrl = submitData.outputs?.[0] || submitData.url;
      return NextResponse.json({ ok: true, media_url: mediaUrl, prompt: finalPrompt, model, platform, character, aspect_ratio: ar });
    }

    const result = await pollResult(requestId, apiKey);
    const mediaUrl = result.outputs?.[0] || result.url || result.output?.url;

    return NextResponse.json({
      ok: true,
      media_url: mediaUrl,
      request_id: requestId,
      prompt: finalPrompt,
      model,
      platform,
      character,
      aspect_ratio: ar,
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
