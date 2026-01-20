import { useCallback, useState } from "react";

export type DiagramType =
  | "manifest"
  | "kustomize"
  | "helmfile"
  | "namespace"
  | "all-namespaces";

export interface GenerateDiagramInput {
  type: DiagramType;
  name: string;
  path?: string;
  namespace?: string;
}

type GeneratorStatus = "idle" | "running" | "success" | "error";

export function useDiagramGenerator() {
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (input: GenerateDiagramInput) => {
      setStatus("running");
      setError(null);

      try {
        const res = await fetch("/api/diagrams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Diagram generation failed");
        }

        setStatus("success");
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
        setStatus("error");
        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    generate,
    status,
    error,
    isIdle: status === "idle",
    isRunning: status === "running",
    isSuccess: status === "success",
    isError: status === "error",
    reset,
  };
}
