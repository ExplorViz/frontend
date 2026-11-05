/** Formats a failed HTTP response without consuming the caller's response body. */
export async function getResponseErrorMessage(response: Response, fallback = 'Something went wrong'): Promise<string> {
  let message = '';
  try {
    const body = (await response.clone().text()).trim();
    if (body) {
      try {
        const error: unknown = JSON.parse(body);
        if (typeof error === 'string') {
          message = error.trim();
        } else if (error && typeof error === 'object') {
          const fields = error as Record<string, unknown>;
          for (const key of ['message', 'detail', 'error', 'title']) {
            const value = fields[key];
            if (typeof value === 'string' && value.trim()) {
              message = value.trim();
              break;
            }
          }
        }
      } catch {
        // Proxy error pages are not useful as user-facing messages.
        if (!/^\s*</.test(body)) {
          message = body;
        }
      }
    }
  } catch {
    // Keep the HTTP status even when the response body cannot be read.
  }
  return `${response.status}: ${message || fallback}`;
}
