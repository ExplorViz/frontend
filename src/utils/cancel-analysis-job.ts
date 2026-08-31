import { getCodeAnalyzerUrl } from 'explorviz-frontend/src/utils/code-analyzer-url';

const codeAnalyzerUrl = getCodeAnalyzerUrl();

export type CancelAnalysisResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export async function cancelAnalysisJob(
  landscapeToken: string
): Promise<CancelAnalysisResult> {
  const response = await fetch(
    `${codeAnalyzerUrl}/api/analysis/cancel/${encodeURIComponent(landscapeToken)}`,
    { method: 'DELETE' }
  );

  if (response.ok) {
    return { ok: true };
  }

  const message = await response.text();
  return { ok: false, status: response.status, message };
}
