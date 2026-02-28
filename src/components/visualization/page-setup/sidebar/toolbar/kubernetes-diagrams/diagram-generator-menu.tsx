import { type DiagramType } from 'explorviz-frontend/src/hooks/useDiagramGenerator';
import { useRef, useState } from 'react';

export function DiagramGeneratorMenu({
  onGenerate,
  isRunning,
}: {
  onGenerate: (type: DiagramType, path?: string, file?: File) => void;
  isRunning: boolean;
}) {
  const [type, setType] = useState<DiagramType>('manifest');
  const [path, setPath] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    onGenerate(type, path || undefined, file || undefined);
    // Clear file after generate so both path and file inputs are usable again
    if (file) {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #ccc' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DiagramType)}
        >
          <option value="manifest">Manifest</option>
          <option value="kustomize">Kustomize</option>
          <option value="helmfile">Helmfile</option>
        </select>

        <input
          placeholder="Path"
          value={path}
          disabled={!!file}
          onChange={(e) => setPath(e.target.value)}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] ?? null;
            setFile(selectedFile);
            if (selectedFile) {
              setPath('');
            }
          }}
        />

        <button
          disabled={isRunning || (!path && !file)}
          onClick={handleGenerate}
        >
          {isRunning ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
