import { useEffect, useState, useRef } from "react";

const svgModules = import.meta.glob("/public/manifest-svgs/*.svg", {
  eager: true,
  import: "default",
});

export default function KubernetesDiagrams() {
  const [svgs, setSvgs] = useState<{ name: string; url: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    const entries = Object.entries(svgModules).map(([path, url]) => ({
      name: path.split("/").pop()?.replace(".svg", "") ?? "Untitled",
      url: url as string,
    }));
    setSvgs(entries);
  }, []);

  return (
    <div className="w-full h-full p-4">
      {/* Tab list */}
      <div
        className="flex gap-2 border-b pb-2"
        role="tablist"
        aria-label="Kubernetes Diagram Tabs"
      >
        {svgs.map((svg, index) => (
          <button
            key={index}
            ref={el => {
              tabRefs.current[index] = el!;
            }}
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`panel-${index}`}
            tabIndex={activeIndex === index ? 0 : -1}
            onClick={() => setActiveIndex(index)}
            className={`px-3 py-1 rounded-t-md outline-none focus:ring-2 focus:ring-blue-500 ${
              activeIndex === index
                ? "bg-blue-500 text-blue"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {svg.name}
          </button>
        ))}
      </div>

      {/* Active panel — lazy loads the SVG */}
      {svgs.length > 0 && (
        <div
          id={`panel-${activeIndex}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeIndex}`}
          className="w-full h-full mt-4"
        >
          <object
            key={svgs[activeIndex].url} // ensures reload only when activeIndex changes
            type="image/svg+xml"
            data={svgs[activeIndex].url}
            className="w-full h-full border rounded-md"
          />
        </div>
      )}
    </div>
  );
}
