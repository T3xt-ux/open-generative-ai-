import { NextResponse } from 'next/server';

// NOTE: /api/v1/* is fully handled by app/api/api/v1/[[...path]]/route.js
// and its specialised sub-routes. The middleware no longer rewrites /api/v1
// to avoid a dead-code proxy path that bypasses cookie-based auth injection.
//
// /api/app/* and /api/workflow/* have dedicated Route Handlers at
// app/api/app/[[...path]] and app/api/workflow/[[...path]] respectively,
// so this middleware is a pass-through stub kept for clarity.

export function middleware(request) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // All routes served by Route Handlers directly — no middleware rewrites needed
};
