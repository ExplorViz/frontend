import { Box, Html, Line } from '@react-three/drei';
import { Container, Root, Text } from '@react-three/uikit';
import { Button, Checkbox, Input, Label } from '@react-three/uikit-default';
import { RefreshCcw } from '@react-three/uikit-lucide';
import * as htmlToImage from 'html-to-image';
import sha256 from 'js-sha256';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function BabiaHtml({
  html,
  updateHtml,
}: {
  html: HTMLElement | null;
  updateHtml: () => void;
}) {
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [htmlBoxes, setHtmlBoxes] = useState<BoxData[]>([]);
  const [useHashedColors, setUseHashedColors] = useState(false);
  const [renderLeafNodes, setRenderLeafNodes] = useState(false);
  const [distanceBetweenLevels, setDistanceBetweenLevels] = useState(5);
  const [reloadCounter, setReloadCounter] = useState(0);
  const observerCallback = () => {
    setReloadCounter(reloadCounter + 1);
  };
  const observer = useRef(new MutationObserver(observerCallback));
  const maxLayer = useRef(0);

  const [updateWithObserver, setUpdateWithObserver] = useState(true);

  const sizeX = 1000;
  const sizeY = 1000;
  const scale = 0.5;
  const positionBottom = -500 * scale;
  const positionLeft = 800;
  const navbarHeight = 40;
  const inputWidth = 50;

  const [restrictToLayer, setRestrictToLayer] = useState(0);
  const [searchString, setSearchString] = useState('');
  const [cropToViewport, setCropToViewport] = useState(true);

  const clamp = (num: number, min: number, max: number) =>
    Math.min(Math.max(num, min), max);

  useEffect(() => {
    console.log('Html updated');
  }, [html]);

  useEffect(() => {
    if (!html) {
      setBoxes([]);
      return;
    }

    // Avoid that multiple observer fire in parallel
    observer.current.disconnect();

    // Register (new) observer
    observer.current = new MutationObserver(observerCallback);
    if (updateWithObserver) {
      observer.current.observe(html, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    let tempBoxes: BoxData[] = [];
    const rootChildren = Array.from(html.children);
    let firstOffset: NodeOffset | null = null;

    let maxLevel = 0;

    const processNode = async (node: HTMLElement, level: number) => {
      if (level > maxLevel) {
        maxLevel = level;
      }

      let rect: DOMRect = node.getBoundingClientRect();

      const clampedLeft = clamp(rect.left, 0, 1920);
      const clampedRight = clamp(rect.right, 0, 1920);
      const clampedWidth = Math.max(0, clampedRight - clampedLeft);
      const clampedTop = clamp(rect.top, 0, 1080);
      const clampedBottom = clamp(rect.bottom, 0, 1080);
      const clampedHeight = Math.max(0, clampedBottom - clampedTop);
      if (cropToViewport) {
        rect = new DOMRect(
          clampedLeft,
          clampedTop,
          clampedWidth,
          clampedHeight
        );
      }

      if (!firstOffset) {
        firstOffset = { x: rect.left * NODE_SCALAR, y: rect.top * NODE_SCALAR };
      }

      const offset = getOffset(rect, firstOffset);

      // Only display html element itself without child nodes
      let htmlString = node.outerHTML.replace(node.innerHTML || '', '');
      const innerText =
        node.firstChild?.nodeType === node.TEXT_NODE ? node.innerText : '';
      const htmlWithText = htmlString.replace('>', '>' + innerText);

      const boxData: BoxData = {
        id: Math.random(),
        position: [offset.x, offset.y, level * distanceBetweenLevels],
        size: [
          Math.max(1, rect.width * NODE_SCALAR * 0.98),
          Math.max(1, rect.height * NODE_SCALAR * 0.98),
          0.01,
        ],
        htmlNode: node,
        renderHtml: renderHtml(node),
        level,
        htmlString,
        innerText,
        htmlWithText,
        children: [],
        texture: null,
      };

      if (!cropToViewport || (clampedWidth > 0 && clampedHeight > 0)) {
        tempBoxes.push(boxData);
      }

      Array.from(node.children).forEach((child) =>
        processNode(child, level + 1)
      );
    };

    rootChildren.forEach((node) => processNode(node, 0));

    maxLayer.current = maxLevel;
    setBoxes(tempBoxes);
  }, [cropToViewport, html, reloadCounter, updateWithObserver]);

  const renderHtml = (node: HTMLElement) => {
    const childNodes = Array.from(node.children);
    let allChildrenEmpty = true;
    for (let index = 0; index < childNodes.length; index++) {
      const element = childNodes[index];

      if (
        element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0 &&
        element.tagName !== 'path' &&
        element.tagName !== 'SPAN'
      ) {
        allChildrenEmpty = false;
      }
    }
    return allChildrenEmpty;
  };

  // Render HTML textures
  useEffect(() => {
    if (!html || boxes.length === 0 || !renderLeafNodes) {
      const tempBoxes = boxes;
      tempBoxes.forEach((box) => (box.texture = null));
      setBoxes(tempBoxes);
      setHtmlBoxes([]);

      return;
    }

    const tempBoxes = boxes;
    const leafNodes = tempBoxes.filter((node) => node.renderHtml);

    let promises: Promise<any>[] = [];
    leafNodes.forEach((leafNode) => {
      promises.push(
        htmlToImage
          .toPng(leafNode.htmlNode)
          .then((dataUrl) => {
            const img = new Image();
            img.src = dataUrl;
            document.body.appendChild(img);
            if (img.width === 0 || img.height === 0) return leafNode;

            const loader = new THREE.TextureLoader();

            // load a resource
            const texture = loader.load(
              // resource URL
              dataUrl
            );
            leafNode.texture = texture;

            return leafNode;
          })
          .catch((err) => {
            console.error('oops, something went wrong!', err);
          })
      );
    });
    Promise.all(promises).then((values) => {
      setHtmlBoxes(values);
    });
  }, [boxes, renderLeafNodes]);

  const isBoxVisible = (box: BoxData) => {
    return (
      (!restrictToLayer || box.level + 1 === restrictToLayer) &&
      (!searchString ||
        box.htmlWithText.toLowerCase().includes(searchString.toLowerCase()))
    );
  };

  return (
    <group
      onPointerEnter={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
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
              setDistanceBetweenLevels((prev) => Math.max(1, prev - 1));
            }
          }}
        >
          <Container flexDirection="row" alignItems="flex-start" gap={10}>
            <Container flexDirection="column" alignItems="flex-start" gap={10}>
              <Container gap={35}>
                <Label>
                  <Text fontSize={15}>Depth:</Text>
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
                  height={navbarHeight / 2}
                />
              </Container>
              <Container gap={0}>
                <Label>
                  <Text fontSize={10}>Only Show Layer:</Text>
                </Label>
                <Input
                  value={restrictToLayer.toString()}
                  onValueChange={(value) => {
                    const newValue = parseFloat(value);
                    if (!isNaN(newValue)) {
                      setRestrictToLayer(
                        Math.max(0, Math.min(maxLayer.current + 1, newValue))
                      );
                    }
                  }}
                  onWheel={(event) => {
                    event.stopPropagation();
                    if (event.deltaX > 0) {
                      setRestrictToLayer((prev) =>
                        Math.min(maxLayer.current + 1, prev + 1)
                      );
                    }
                    if (event.deltaX < 0) {
                      setRestrictToLayer((prev) => Math.max(0, prev - 1));
                    }
                  }}
                  width={inputWidth}
                  height={navbarHeight / 2}
                />
              </Container>
            </Container>
            <Container flexDirection="column" gap={1}>
              <Container flexDirection="row" gap={5}>
                <Checkbox
                  checked={updateWithObserver}
                  onCheckedChange={(isActive) => {
                    setUpdateWithObserver(isActive);
                  }}
                />
                <Label>
                  <Text>Cont. Update</Text>
                </Label>
              </Container>
              <Container flexDirection="row" gap={5}>
                <Checkbox
                  checked={cropToViewport}
                  onCheckedChange={(isActive) => {
                    setCropToViewport(isActive);
                  }}
                />
                ;
                <Label>
                  <Text>Crop to Viewport</Text>
                </Label>
              </Container>
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
                <Checkbox
                  checked={renderLeafNodes}
                  onCheckedChange={(isActive) => {
                    setRenderLeafNodes(isActive);
                  }}
                />
                ;
                <Label>
                  <Text>Render HTML</Text>
                </Label>
              </Container>
            </Container>
            <Container gap={10}>
              <Label>
                <Text fontSize={15}>Search:</Text>
              </Label>
              <Input
                value={searchString}
                onValueChange={(value) => {
                  setSearchString(value);
                }}
                width={150}
                height={navbarHeight}
              />
            </Container>
            <Container gap={10}>
              <Button
                width={navbarHeight}
                height={navbarHeight}
                padding={0}
                onClick={() => updateHtml()}
              >
                <RefreshCcw />
              </Button>
            </Container>
          </Container>
          <Container positionBottom={620} positionLeft={-540}>
            <Text>
              HTML Nodes: {boxes.filter((box) => isBoxVisible(box)).length}
            </Text>
          </Container>
        </Root>
      )}
      {boxes.map((box, _) => (
        <Box3D
          visible={isBoxVisible(box)}
          distanceBetweenLevels={distanceBetweenLevels}
          key={box.id}
          box={box}
          color={
            useHashedColors
              ? generateColorFromObject(box.htmlString)
              : COLORS_GRAD[box.level % COLORS_GRAD.length]
          }
        />
      ))}
      {htmlBoxes.map((box, _) => (
        <Box3D
          visible={isBoxVisible(box)}
          distanceBetweenLevels={distanceBetweenLevels}
          key={box.id}
          box={box}
          color={
            useHashedColors
              ? generateColorFromObject(box.htmlString)
              : COLORS_GRAD[box.level % COLORS_GRAD.length]
          }
        />
      ))}
    </group>
  );
}

function Box3D({
  box,
  color,
  distanceBetweenLevels,
  visible,
}: {
  box: BoxData;
  color: string;
  distanceBetweenLevels: number;
  visible: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  return (
    <group
      position={[300, 218, 0]}
      intersectChildren={false}
      visible={visible}
      onPointerEnter={(event) => {
        if (visible) {
          event.stopPropagation();
          setHovered(true);
        }
      }}
      onPointerLeave={(event) => {
        if (visible) {
          event.stopPropagation();
        }
        setHovered(false);
      }}
      onClick={(event) => {
        if (visible) {
          event.stopPropagation();
          setClicked((prev) => !prev);
        }
      }}
      onDoubleClick={(event) => {
        if (visible) {
          event.stopPropagation();
          box.htmlNode.click();
        }
      }}
    >
      <Box position={[135, -63, -1]} args={[290, 200, 1]} />
      <mesh
        position={[
          box.position[0],
          box.position[1],
          box.level * distanceBetweenLevels,
        ]}
      >
        {!clicked && <boxGeometry args={box.size} />}
        {clicked && (
          <boxGeometry args={[box.size[0], box.size[1], box.size[2] + 10]} />
        )}
        <meshBasicMaterial
          map={box.texture}
          color={box.texture ? 'white' : color}
          transparent={true}
          opacity={1}
        />
      </mesh>
      {box.level !== 0 && (
        <Line
          points={[
            [
              box.position[0],
              box.position[1],
              box.level * distanceBetweenLevels,
            ],
            [
              box.position[0],
              box.position[1],
              box.level * distanceBetweenLevels - distanceBetweenLevels,
            ],
          ]}
          color={'black'}
        />
      )}
      {hovered && (
        <Html
          position={[
            box.position[0],
            box.position[1] + box.size[1] / 2 + box.htmlWithText.length * 0.25,
            box.level * distanceBetweenLevels + 0.2,
          ]}
          occlude={'blending'}
          transform
          raycast={() => {}}
        >
          <div
            style={{
              background: 'white',
              padding: '10px',
              border: '1px solid black',
              whiteSpace: 'pre-wrap',
              fontSize: '10rem',
              pointerEvents: 'none',
            }}
          >
            {/* {box.htmlWithText} */}
            <code style={{ pointerEvents: 'none' }}>{box.htmlWithText}</code>
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
  htmlNode: any;
  level: number;
  renderHtml: boolean;
  htmlString: string;
  innerText: string;
  htmlWithText: string;
  children: any[];
  texture: any;
};

type NodeOffset = {
  x: number;
  y: number;
};
