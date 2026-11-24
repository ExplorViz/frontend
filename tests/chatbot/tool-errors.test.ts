import { expect, it, vi } from 'vitest';
import { getErrorMessage, reportErrors } from '../../src/components/chatbot/tool-errors';

it('returns the error of a tool to the chatbot instead of ending the conversation', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const handler = reportErrors(async (metric: string) => {
    throw new Error(`Unknown metric ${metric}`);
  });

  const result = await handler('x');

  expect(result).toBe('Error: Unknown metric x');
  expect(getErrorMessage(result)).toBe('Unknown metric x');
});

it('leaves results that are no errors as they are', async () => {
  const parts = [{ type: 'text', text: 'Screenshot' }];

  expect(await reportErrors(async () => parts)()).toBe(parts);
  expect(getErrorMessage(parts)).toBeUndefined();
  expect(getErrorMessage('{"commits":[]}')).toBeUndefined();
});
