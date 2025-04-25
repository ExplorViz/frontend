import { Box, Html } from '@react-three/drei';
import { Container, Root, Text } from '@react-three/uikit';
import { Input } from '@react-three/uikit-default';
import { Button, Checkbox, Label } from '@react-three/uikit-default';
import { RefreshCcw } from '@react-three/uikit-lucide';
import sha256 from 'js-sha256';
import { useEffect, useState } from 'react';

export default function BabiaHtml({ html }: { html: HTMLElement | null }) {
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [useHashedColors, setUseHashedColors] = useState(false);
  const [distanceBetweenLevels, setDistanceBetweenLevels] = useState(5);

  const sizeX = 1000;
  const sizeY = 1000;
  const scale = 0.5;
  const positionBottom = -500 * scale;
  const positionLeft = 800;
  const navbarHeight = 40;
  const inputWidth = 75;

  useEffect(() => {
    if (!html) {
      setBoxes([]);
      return;
    }
    let tempBoxes: BoxData[] = [];
    const rootChildren = Array.from(html.children);
    let firstOffset: NodeOffset | null = null;

    const processNode = async (node: HTMLElement, level: number) => {
      const rect: DOMRect = node.getBoundingClientRect();

      if (!firstOffset) {
        firstOffset = { x: rect.left * NODE_SCALAR, y: rect.top * NODE_SCALAR };
      }

      const offset = getOffset(rect, firstOffset);

      const boxData: BoxData = {
        id: Math.random(),
        position: [offset.x, offset.y, level * distanceBetweenLevels],
        size: [rect.width * NODE_SCALAR, rect.height * NODE_SCALAR, 0.01],
        level,
        html: node.outerHTML,
        children: [],
        texture: null,
      };

      // if (renderHTML && typeof html2canvas !== 'undefined') {
      //   const isLeaf = node.children.length === 0;

      //   // Create a temporary node to render the HTML

      //   // node.parentNode?.removeChild(node);
      //   // document.body.appendChild(node);
      //   if (!renderHTMLOnlyLeafs || isLeaf) {
      //     // const canvas = await html2canvas(node);
      //     // console.log('canvas', canvas);
      //     // const texture = new THREE.Texture(canvas);
      //     // texture.needsUpdate = true;
      //     // boxData.texture = texture;
      //     // setBoxes((prev) => [...prev]); // trigger re-render
      //   }
      // }

      tempBoxes.push(boxData);

      Array.from(node.children).forEach((child) =>
        processNode(child, level + 1)
      );
    };

    rootChildren.forEach((node) => processNode(node, 0));
    setBoxes(tempBoxes);
  }, [html, distanceBetweenLevels]);

  return (
    <group>
      {html && (
        <Root
          positionBottom={positionBottom}
          positionLeft={positionLeft}
          sizeX={sizeX}
          sizeY={sizeY}
          pixelSize={scale}
          onWheel={(event) => {
            if (event.deltaX > 0) {
              setDistanceBetweenLevels((prev) => prev + 1);
            }
            if (event.deltaX < 0) {
              setDistanceBetweenLevels((prev) => prev - 1);
            }
          }}
        >
          <Container flexDirection="row" alignItems="flex-start" gap={115}>
            <Container gap={10}>
              <Label>
                <Text fontSize={20}>Depth:</Text>
              </Label>
              <Input
                value={distanceBetweenLevels.toString()}
                onValueChange={(value) => {
                  const newValue = parseFloat(value);
                  if (!isNaN(newValue)) {
                    setDistanceBetweenLevels(newValue);
                  }
                }}
                width={inputWidth}
                height={navbarHeight}
              />
            </Container>
            <Container flexDirection="column" gap={8}>
              <Container flexDirection="row" gap={5}>
                <Checkbox
                  checked={useHashedColors}
                  onCheckedChange={(isActive) => {
                    setUseHashedColors(isActive);
                  }}
                />
                ;
                <Label>
                  <Text>Hashed Colors</Text>
                </Label>
              </Container>
              <Container flexDirection="row" gap={5}>
                <Checkbox />
                <Label>
                  <Text>Show HTML</Text>
                </Label>
              </Container>
            </Container>
            <Container gap={10}>
              <Button width={navbarHeight} height={navbarHeight} padding={0}>
                <RefreshCcw />
              </Button>
            </Container>
          </Container>
        </Root>
      )}
      {boxes.map((box, _) => (
        <Box3D
          key={box.id}
          box={box}
          color={
            useHashedColors
              ? generateColorFromObject(box.html)
              : COLORS_GRAD[box.level % COLORS_GRAD.length]
          }
        />
      ))}
    </group>
  );
}

function Box3D({ box, color }: { box: BoxData; color: string }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  return (
    <group position={[300, 218, 0]}>
      <Box position={[135, -63, -1]} args={[290, 200, 1]} />
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

const NODE_SCALAR = 0.14;
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

function getOffset(rect: DOMRect, firstOffset: NodeOffset) {
  return {
    x:
      rect.right * NODE_SCALAR - (rect.width * NODE_SCALAR) / 2 - firstOffset.x,
    y:
      -rect.bottom * NODE_SCALAR +
      (rect.height * NODE_SCALAR) / 2 +
      firstOffset.y,
  };
}

function generateColorFromObject(obj: any): string {
  const hash = sha256(JSON.stringify(obj));
  const hexColor = '#' + hash.substring(0, 6);
  return hexColor;
}

type BoxData = {
  id: number;
  position: [number, number, number];
  size: [number, number, number];
  level: number;
  html: any;
  children: any[];
  texture: any;
};

type NodeOffset = {
  x: number;
  y: number;
};
