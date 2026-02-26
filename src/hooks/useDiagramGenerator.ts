import { useCallback, useState } from 'react';

export type DiagramType = 'manifest' | 'kustomize' | 'helmfile';

export interface GenerateDiagramInput {
  type: DiagramType;
  path?: string;
  file?: File;
}

type GeneratorStatus = 'idle' | 'running' | 'success' | 'error';

export function useDiagramGenerator() {
  const [status, setStatus] = useState<GeneratorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  const generate = useCallback(async (input: GenerateDiagramInput) => {
    setStatus('running');
    setError(null);
    setSvg(null);

    try {
      const formData = new FormData();
      formData.append('type', input.type)

      if (input.path) {
        formData.append('path', input.path);
      }

      if (input.file) {
        formData.append('file', input.file);
      }

      const res = await fetch('/api/diagrams', {
        method: 'POST',
        body: formData,
      });

      const body = res.body;
      if (!res.ok || body == null) {
        const text = await res.text();
        throw new Error(text || 'Diagram generation failed');
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let svgText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        svgText += decoder.decode(value, { stream: true });
      }

      setSvg(svgText);
      setStatus('success');
      return svgText;
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
      setStatus('error');
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setSvg(null);
  }, []);

  return {
    generate,
    svg,
    status,
    error,
    isIdle: status === 'idle',
    isRunning: status === 'running',
    isSuccess: status === 'success',
    isError: status === 'error',
    reset,
  };
}
