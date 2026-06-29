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

// CHARACTER_MODIFIERS v3 — locked to SpandiLand aesthetic from f3dral.com references
// Two modes per character type:
// HUMAN CHARS (Microdjimz, Gwincha, Salpz, Jinga): 
//   Real-world AR filter aesthetic — photorealistic environments, cartoon-filtered faces
// ANIMAL/CREATURE CHARS (Bamba, Wolfa): 
//   Real animals composited into SpandiLand purple-flora world, no cartoon
const CHARACTER_MODIFIERS = {
  microdjimz: [
    'cartoon AR filter portrait of a dark-skinned Black man with a rounded cartoon face,',
    'big bright glowing green eyes like a Disney prince, smooth cartoon skin texture,',
    'wearing a coral pink hoodie with the hood up, dark glasses pushed up on forehead,',
    'full thick beard, warm expression, adventurous look upward,',
    'olive-green puffer jacket over the hoodie, sparkle star particles on face,',
    'background: real outdoor forest scene with teal-green sky, purple-tinted trees,',
    'SpandiLand AR filter aesthetic — real environment with cartoon-filtered character,',
    'vertical 9:16 portrait, cinematic, SpandiLand universe by f3dRaL',
  ].join(' '),

  gwincha: [
    'full 3D CGI render of a fierce Black female warrior, athletic build, dark skin,',
    'tight hair bun, sharp determined eyes, beautiful yet intimidating expression,',
    'wearing white form-fitting armour with black tactical vest, ornate black circular shield,',
    'holding a long silver spear with both hands, combat stance,',
    'background: dramatic purple-white cloudy sky, floating black oval orbs in grid pattern,',
    'Pixar-quality CGI character, cinematic lighting, volumetric god rays,',
    'SpandiLand universe warrior aesthetic, 9:16 vertical cinematic shot',
  ].join(' '),

  salpz: [
    'full 3D CGI render of a menacing Black female adversary, dark skin, sharp features,',
    'sleek black armour with angular gold accents, cold calculating expression,',
    'dark energy radiating around her, shadowy cape billowing,',
    'glowing amber-red eyes, elegant yet dangerous posture,',
    'background: dark SpandiLand void, deep purple shadows, floating dark geometric shapes,',
    'Pixar-quality CGI villain character, dramatic rim lighting, high contrast,',
    'SpandiLand universe adversary aesthetic, 9:16 vertical cinematic shot',
  ].join(' '),

  bamba: [
    'a real baby deer fawn, warm russet-brown spotted coat, tiny black hooves,',
    'small alert ears, big innocent dark eyes, delicate long neck,',
    'lying or walking in SpandiLand purple grass field,',
    'background: aerial or eye-level view of purple lavender-like ground cover,',
    'small purple wildflowers, warm amber light, teal-tinged shadows,',
    'photorealistic animal in surreal colour-graded SpandiLand world,',
    'child-friendly magical atmosphere, no cartoon, real fawn in fantasy world,',
    '9:16 vertical, SpandiLand universe by f3dRaL',
  ].join(' '),

  wolfa: [
    'a real wolf pup with a fluffy grey-silver coat, bright curious amber eyes,',
    'small fierce expression mixed with adorable fluffiness, pointed ears,',
    'sitting alert in SpandiLand purple grass field,',
    'background: purple-toned ground cover, teal-lit forest edge, warm golden light,',
    'photorealistic wolf pup in surreal SpandiLand colour world,',
    'cute yet fierce energy, child-friendly, magical atmosphere,',
    '9:16 vertical, SpandiLand universe by f3dRaL',
  ].join(' '),

  jinga: [
    'colossal 3D CGI giant warrior towering over a real city skyline,',
    'dark-skinned Black male figure, powerful calm expression, natural hair,',
    'wearing dark tactical armour with amber glowing accents,',
    'city buildings at knee level, real urban environment below,',
    'dramatic purple-tinted sky, golden hour light, atmospheric haze,',
    'the wanderer giant aesthetic — CGI character composited into real cityscape,',
    'SpandiLand universe, cinematic full-body shot, 9:16 vertical',
  ].join(' '),

  'skylar-nini': [
    'cartoon AR filter portrait of a Black woman with a radiant cartoon face,',
    'big luminous gold eyes, natural afro halo, warm glowing skin,',
    'wearing a white sleeveless top, gold ear cuffs, visionary upward gaze,',
    'animated fractal light patterns floating around her, star sparkles,',
    'background: SpandiLand rooftop golden hour, purple blooming trees, teal sky,',
    'SpandiLand AR filter aesthetic — real environment with cartoon-filtered character,',
    'vertical 9:16 portrait, cinematic, SpandiLand universe by f3dRaL',
  ].join(' '),

  dolphia: [
    'full 3D CGI Black female figure, fluid oceanic movement, teal-scaled accents,',
    'flowing violet and teal garments, locs adorned with glowing shells,',
    'background: SpandiLand Aqua Realm — purple coral, bioluminescent teal water,',
    'Pixar-quality CGI character, underwater light rays, magical atmosphere,',
    '9:16 vertical cinematic, SpandiLand Aqua Realm',
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
