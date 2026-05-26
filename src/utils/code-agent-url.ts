/** Base URL for the code-agent API. Empty string uses same-origin (nginx / Vite dev proxy). */
export function getCodeAgentUrl(): string {
  const configured = import.meta.env.VITE_CODE_AGENT_URL as string | undefined;
  if (configured === undefined || configured === '') {
    return '';
  }
  return configured.replace(/\/$/, '');
}
