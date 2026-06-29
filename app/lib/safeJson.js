/**
 * safeJson — safe upstream response reader for all proxy routes.
 * Handles: 204 No Content, non-JSON bodies (HTML error pages, rate-limit pages),
 * and partial JSON from truncated responses.
 */
export async function safeJson(response) {
  if (response.status === 204) {
    return { _status: 204 };
  }
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('application/json') && !ct.includes('text/json')) {
    const text = await response.text().catch(() => '');
    return {
      error: 'Upstream returned non-JSON response',
      upstream_status: response.status,
      upstream_body_preview: text.slice(0, 200),
    };
  }
  try {
    return await response.json();
  } catch {
    const text = await response.text().catch(() => '');
    return {
      error: 'Failed to parse upstream JSON',
      upstream_status: response.status,
      upstream_body_preview: text.slice(0, 200),
    };
  }
}
