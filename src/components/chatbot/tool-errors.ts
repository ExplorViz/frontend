const ERROR_PREFIX = 'Error: ';

/**
 * Turns an error of a tool handler into the result of the tool. CopilotKit does
 * not continue the conversation after a handler threw: the chatbot would never
 * see the message, could not correct its call, and the user got no answer.
 */
export function reportErrors<Args extends unknown[]>(handler: (...args: Args) => Promise<unknown>) {
  return async (...args: Args): Promise<unknown> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.warn('[Chatbot] Tool call failed', error);
      return `${ERROR_PREFIX}${error instanceof Error ? error.message : String(error)}`;
    }
  };
}

/** The message of an error that a tool call resulted in, for showing it to the user. */
export function getErrorMessage(result: unknown): string | undefined {
  return typeof result === 'string' && result.startsWith(ERROR_PREFIX) ? result.slice(ERROR_PREFIX.length) : undefined;
}
