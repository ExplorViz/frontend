import { useEffect, useState } from "react";

const svgModules = import.meta.glob('/public/manifest-svgs/*.svg', { eager: true, import: 'default' });

export default function KubernetesDiagrams() {
  const [svgs, setSvgs] = useState<string[]>([]);

  useEffect(() => {
    setSvgs(Object.values(svgModules) as string[]);
  }, []);

  return (
    <div className="w-full h-full p-4 flex flex-wrap gap-4">
      {svgs.map((url, index) => (
        <object key={index} type="image/svg+xml" data={url} className="w-24 h-24" />
      ))}
    </div>
  );
}
