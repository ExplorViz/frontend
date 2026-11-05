import assert from 'node:assert/strict';
import { test } from 'vitest';
import { getResponseErrorMessage } from '../src/utils/response-error.ts';

test('shows the HTTP status and backend JSON message', async () => {
  const response = new Response(JSON.stringify({ code: 'DEMO_MODE', message: 'Changes are disabled.' }), {
    status: 403,
  });
  assert.equal(await getResponseErrorMessage(response), '403: Changes are disabled.');
  assert.equal((await response.json()).code, 'DEMO_MODE');
});

test('supports problem details and other backend error fields', async () => {
  for (const key of ['detail', 'error', 'title']) {
    const response = new Response(JSON.stringify({ [key]: 'Invalid request' }), { status: 400 });
    assert.equal(await getResponseErrorMessage(response), '400: Invalid request');
  }
});

test('shows plain text and JSON string messages', async () => {
  for (const body of ['  Token not found  ', JSON.stringify('Token not found')]) {
    assert.equal(await getResponseErrorMessage(new Response(body, { status: 404 })), '404: Token not found');
  }
});

test('falls back for empty, unrecognized JSON, and HTML responses', async () => {
  for (const body of ['', '{}', '{"message":{}}', '{"message":" "}', 'null', '<html>Bad gateway</html>']) {
    assert.equal(
      await getResponseErrorMessage(new Response(body, { status: 502 }), 'Request failed'),
      '502: Request failed'
    );
  }
});

test('retains status when the response body is unreadable', async () => {
  const response = new Response('error', { status: 500 });
  await response.text();
  assert.equal(await getResponseErrorMessage(response), '500: Something went wrong');
});
