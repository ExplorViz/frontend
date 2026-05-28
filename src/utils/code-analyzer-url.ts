/** Base URL for the code-analyzer API. Empty string uses same-origin (nginx / Vite dev proxy). */
export function getCodeAnalyzerUrl(): string {
  const configured = import.meta.env.VITE_CODE_ANALYZER_URL as
    | string
    | undefined;
  if (configured === undefined || configured === '') {
    return '';
  }
  return configured.replace(/\/$/, '');
}
