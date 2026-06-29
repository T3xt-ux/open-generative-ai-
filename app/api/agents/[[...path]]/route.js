import { NextResponse } from 'next/server';
import { safeJson } from '../../../lib/safeJson.js';

const MUAPI_BASE = 'https://api.muapi.ai';
const DEBUG = process.env.MUAPI_PROXY_DEBUG === '1';

function getApiKey(request) {
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey;
  return request.cookies.get('muapi_key')?.value;
}

function cleanHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('cookie'); // Never forward browser cookies to MuAPI
  return headers;
}

// Build target URL without trailing slash when path is empty.
// GET /api/agents?is_template=true → https://api.muapi.ai/agents?is_template=true
function buildTargetUrl(pathSegments, search) {
  const path = pathSegments.join('/');
  const base = `${MUAPI_BASE}/agents`;
  return path ? `${base}/${path}${search}` : `${base}${search}`;
}

export async function GET(request, { params }) {
  const { path = [] } = await params;
  const { search } = new URL(request.url);
  const targetUrl = buildTargetUrl(path, search);
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);
  if (DEBUG) console.log(`[agents GET] ${targetUrl}`);
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
  const targetUrl = buildTargetUrl(path, search);
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);
  if (DEBUG) console.log(`[agents POST] ${targetUrl}`);
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
  const targetUrl = buildTargetUrl(path, search);
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

export async function PUT(request, { params }) {
  const { path = [] } = await params;
  const { search } = new URL(request.url);
  const targetUrl = buildTargetUrl(path, search);
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);
  try {
    const body = await request.arrayBuffer();
    const response = await fetch(targetUrl, { method: 'PUT', headers, body });
    const data = await safeJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { path = [] } = await params;
  const { search } = new URL(request.url);
  const targetUrl = buildTargetUrl(path, search);
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
