import { Html } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
// import html2canvas from 'html2canvas';

const NODE_SCALAR = 0.15;
const COLORS_GRAD = [
  '#4B0082',
  '#800080',
  '#B22222',
  '#A0522D',
  '#CD5C5C',
  '#8B008B',
  '#9932CC',
  '#FF4500',
  '#FF8C00',
  '#B8860B',
  '#D2691E',
  '#DAA520',
  '#ADFF2F',
  '#7FFF00',
  '#32CD32',
  '#00FF00',
  '#00FA9A',
  '#40E0D0',
  '#4682B4',
  '#1E90FF',
  '#0000FF',
  '#4169E1',
  '#8A2BE2',
  '#FF00FF',
  '#FF1493',
  '#FF69B4',
  '#FF6347',
  '#FFA07A',
  '#FFA500',
  '#FFD700',
  '#FFFF00',
  '#FFFACD',
  '#F0E68C',
  '#E6E6FA',
  '#F0F8FF',
  '#E0FFFF',
  '#AFEEEE',
  '#ADD8E6',
  '#87CEFA',
  '#B0C4DE',
  '#D3D3D3',
  '#DDA0DD',
  '#EE82EE',
  '#F5DEB3',
  '#FAFAD2',
  '#FFE4E1',
  '#FFF0F5',
  '#F5F5DC',
  '#FFFFE0',
  '#FFF8DC',
  '#F8F8FF',
  '#FFFFFF',
];

function getOffset(rect, firstOffset) {
  return {
    x:
      rect.right * NODE_SCALAR - (rect.width * NODE_SCALAR) / 2 - firstOffset.x,
    y:
      -rect.bottom * NODE_SCALAR +
      (rect.height * NODE_SCALAR) / 2 +
      firstOffset.y,
  };
}

export default function BabiaHtml({
  html,
  distanceLevels = 2,
  renderHTML = false,
  renderHTMLOnlyLeafs = false,
}) {
  const groupRef = useRef();
  const [boxes, setBoxes] = useState([]);

  console.log('BabiaHtml', html);

  useEffect(() => {
    if (!html) {
      setBoxes([]);
      return;
    }
    let tempBoxes = [];
    const rootChildren = Array.from(html.children);
    let firstOffset = null;

    const processNode = (node, level) => {
      const rect = node.getBoundingClientRect();
      if (!firstOffset) {
        firstOffset = { x: rect.left * NODE_SCALAR, y: rect.top * NODE_SCALAR };
      }

      const offset = getOffset(rect, firstOffset);

      const boxData = {
        id: Math.random(),
        position: [offset.x, offset.y, level * distanceLevels],
        size: [rect.width * NODE_SCALAR, rect.height * NODE_SCALAR, 0.01],
        level,
        html: node.outerHTML,
        children: [],
        texture: null,
      };

      // if (renderHTML && typeof html2canvas !== 'undefined') {
      //   const isLeaf = node.children.length === 0;
      //   if (!renderHTMLOnlyLeafs || isLeaf) {
      //     html2canvas(node).then((canvas) => {
      //       const texture = new THREE.Texture(canvas);
      //       texture.needsUpdate = true;
      //       boxData.texture = texture;
      //       setBoxes((prev) => [...prev]); // trigger re-render
      //     });
      //   }
      // }

      tempBoxes.push(boxData);

      Array.from(node.children).forEach((child) =>
        processNode(child, level + 1)
      );
    };

    rootChildren.forEach((node) => processNode(node, 0));
    setBoxes(tempBoxes);
    console.log('Boxes:', tempBoxes);
  }, [html, distanceLevels, renderHTML, renderHTMLOnlyLeafs]);

  return (
    <group ref={groupRef}>
      {boxes.map((box, index) => (
        <Box3D
          key={box.id}
          box={box}
          color={COLORS_GRAD[box.level % COLORS_GRAD.length]}
        />
      ))}
    </group>
  );
}

function Box3D({ box, color }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  return (
    <group position={[300, 200, 0]}>
      <mesh
        position={box.position}
        onPointerEnter={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerLeave={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
        onClick={() => setClicked((prev) => !prev)}
      >
        <boxGeometry args={box.size} />
        <meshBasicMaterial
          map={box.texture}
          color={box.texture ? 'white' : color}
          transparent={true}
        />
      </mesh>

      {(hovered || clicked) && (
        <Html
          position={[
            box.position[0],
            box.position[1] + 1,
            box.position[2] + 0.2,
          ]}
          transform
          occlude
        >
          <div
            style={{
              background: 'white',
              padding: '10px',
              border: '1px solid black',
              whiteSpace: 'pre-wrap',
              fontSize: '75px',
            }}
          >
            <code>{box.html}</code>
          </div>
        </Html>
      )}
    </group>
  );
}
