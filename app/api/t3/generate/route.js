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

// CHARACTER_MODIFIERS v2 — locked to SpandiLand aesthetic:
// Semi-realistic Black character faces with AR filter overlay, glowing eyes,
// sparkle particles, surreal color-graded real-world environments,
// streetwear clothing, no fantasy armor. Characters feel like real people
// inside a living AR universe. Palette: purple flora, teal skies, void backgrounds.
const CHARACTER_MODIFIERS = {
  microdjimz: [
    'semi-realistic Black man, dark skin, natural hair, thoughtful expression,',
    'wearing a muted purple oversized hoodie and vintage glasses with glowing green lenses,',
    'AR filter overlay: animated ink glyphs floating around him, gold sparkle particles,',
    'background: surreal SpandiLand library, purple-leafed trees through tall windows,',
    'teal ambient light, deep void shadows, photorealistic face with subtle AR enhancement,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  bamba: [
    'semi-realistic Black man, deep dark skin, shaved head, serene closed-eye expression,',
    'wearing flowing dark indigo robes over a simple white shirt, no shoes,',
    'AR filter overlay: floating violet orbs orbiting him, soft light emanating from chest,',
    'background: SpandiLand open field at dusk, purple grass, bioluminescent flora,',
    'teal gradient sky, mist at ground level, photorealistic face with AR glow overlay,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  gwincha: [
    'semi-realistic Black man, medium brown skin, locs, intense determined expression,',
    'wearing a worn grey puffer jacket, dark jeans, white sneakers, ear piercings,',
    'AR filter overlay: electric cyan sparks at knuckles, animated graffiti rising behind him,',
    'background: SpandiLand urban street at night, purple-tinted city lights, teal neon reflections,',
    'real city environment with surreal color grade, photorealistic face with AR spark overlay,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  'skylar-nini': [
    'semi-realistic Black woman, medium brown skin, natural afro, wide visionary eyes,',
    'wearing a white sleeveless top and black fitted trousers, minimal jewelry, gold ear cuffs,',
    'AR filter overlay: fractal light patterns on skin, animated star map above her,',
    'background: SpandiLand rooftop at golden hour, purple blooming trees, teal sky,',
    'surreal AR environment seamlessly blended with reality, photorealistic face,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  jinga: [
    'giant semi-realistic Black man towering over a real city skyline,',
    'dark skin, calm powerful expression, natural hair, wearing a simple dark tactical vest,',
    'AR filter overlay: glowing amber eyes, protective aura radiating outward,',
    'background: real urban city from below, buildings at knee height, purple-tinted sky,',
    'colossal scale surreal composition, photorealistic giant figure in real environment,',
    'cinematic full-body shot, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  salpz: [
    'semi-realistic Black man, sharp angular features, cold calculating expression,',
    'wearing all-black — sleek jacket, dark turtleneck, geometric dark glasses,',
    'AR filter overlay: dark smoke wisps from shoulders, glowing red iris eyes,',
    'background: SpandiLand corporate void space, black marble, deep purple shadows,',
    'high contrast noir lighting, photorealistic face with dark AR menace overlay,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  dolphia: [
    'semi-realistic Black woman, deep skin, locs adorned with teal shells,',
    'wearing a flowing teal and violet garment that moves like water,',
    'AR filter overlay: animated water ripples on skin, bioluminescent particles,',
    'background: SpandiLand Aqua Realm, purple coral, teal deep-water light,',
    'surreal underwater-above-water hybrid world, photorealistic face,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  fanfa: [
    'semi-realistic Black child, bright curious eyes, glowing bioluminescent skin markings,',
    'wearing a simple silver-white tunic with teal trim,',
    'AR filter overlay: animated light fish swimming around them, sparkle trail,',
    'background: SpandiLand Aqua Realm shallows, purple sand, teal water glow,',
    'warm magical atmosphere, photorealistic face with luminescent AR overlay,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),

  dale: [
    'semi-realistic Black man, athletic build, wide adventurous grin, natural hair,',
    'wearing a deep-sea explorer jacket in dark teal and black, goggles pushed up on head,',
    'AR filter overlay: compass rose AR hud elements, animated depth markers,',
    'background: SpandiLand Aqua Realm surface, purple horizon, teal ocean, strange sky,',
    'sense of discovery and momentum, photorealistic face with AR explorer overlay,',
    'cinematic portrait, 9:16 vertical, SpandiLand universe',
  ].join(' '),
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
    'SpandiLand universe, semi-realistic AR aesthetic, photorealistic Black character, surreal color-graded real environment, AR filter overlay, purple and teal palette, no fantasy armor, no cartoon style',
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
