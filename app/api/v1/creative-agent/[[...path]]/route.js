import { NextResponse } from 'next/server';
import { safeJson } from '../../../../lib/safeJson.js';

const MUAPI_BASE = 'https://api.muapi.ai';
const DEBUG = process.env.MUAPI_PROXY_DEBUG === '1';

function getApiKey(request) {
  // Accept Bearer token (used by agent library) OR x-api-key header OR cookie
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.substring(7);
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey;
  return request.cookies.get('muapi_key')?.value;
}

function cleanHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('cookie');
  headers.delete('Authorization');
  headers.delete('x-api-key');
  return headers;
}

export async function GET(request, { params }) {
  const { path = [] } = await params;
  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path.join('/')}${search}`;
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);
  if (DEBUG) console.log(`[creative-agent GET] ${targetUrl}`);
  try {
    const response = await fetch(targetUrl, { headers, method: 'GET' });
    const data = await safeJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { path = [] } = await params;
  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path.join('/')}${search}`;
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);
  try {
    const body = await request.arrayBuffer();
    const response = await fetch(targetUrl, { method: 'POST', headers, body });
    const data = await safeJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { path = [] } = await params;
  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path.join('/')}${search}`;
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);
  try {
    const body = await request.arrayBuffer();
    const response = await fetch(targetUrl, { method: 'PATCH', headers, body });
    const data = await safeJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { path = [] } = await params;
  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}/api/v1/creative-agent/${path.join('/')}${search}`;
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);
  try {
    const response = await fetch(targetUrl, { method: 'DELETE', headers });
    const data = await safeJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
