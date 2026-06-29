/**
 * s3UploadProxy — single source of truth for S3 presigned-upload proxying.
 * Used by both /api/upload-binary and /api/v1/upload-binary.
 *
 * S3 presigned POST is sensitive to field ordering:
 *   - All policy fields (key, AWSAccessKeyId, x-amz-*, Content-Type, acl, etc.) FIRST
 *   - 'file' field LAST (required by S3 signature validation)
 *
 * The studio library appends 'file' last natively, so iterating formData.entries()
 * preserves that order. We strip only our internal x-proxy-target-url sentinel.
 */
import { NextResponse } from 'next/server';
import { validateUploadProxyTarget } from '../../src/lib/uploadProxyTarget.js';

export async function handleS3UploadProxy(request) {
  try {
    const formData = await request.formData();
    const targetUrl = formData.get('x-proxy-target-url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing proxy target URL' }, { status: 400 });
    }

    const validated = validateUploadProxyTarget(targetUrl);
    if (!validated.ok) {
      return NextResponse.json(
        { error: 'Invalid upload target', reason: validated.reason },
        { status: 400 }
      );
    }

    // Rebuild FormData preserving field order.
    // S3 requires all policy fields before 'file'.
    // The studio library appends 'file' last — iterating entries() keeps that.
    const s3FormData = new FormData();
    for (const [key, value] of formData.entries()) {
      if (key !== 'x-proxy-target-url') {
        s3FormData.append(key, value);
      }
    }

    const s3Response = await fetch(validated.url, {
      method: 'POST',
      body: s3FormData,
    });

    if (s3Response.ok || s3Response.status === 204) {
      return new Response(null, { status: 204 });
    }

    const errorText = await s3Response.text();
    console.error('[S3 Proxy] Upload failed:', s3Response.status, errorText.slice(0, 300));
    return new Response(errorText, { status: s3Response.status });

  } catch (error) {
    console.error('[S3 Proxy] Exception:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
