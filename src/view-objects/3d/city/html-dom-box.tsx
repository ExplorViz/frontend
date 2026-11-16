import { Edges, Html, Line } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { BoxData } from 'explorviz-frontend/src/view-objects/3d/city/html-visualizer';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const HTML_PIXELS_PER_UNIT = 40;
/** Gap between the top edge of a box and its label in CSS pixels. */
const LABEL_GAP = 12;
const MAX_LABEL_LENGTH = 300;

const noRaycast = () => null;

export default function HtmlDomBox({
  box,
  color,
  levelDistance,
  stackDistance,
  pixelScale,
  visible,
  setClickedNode,
}: {
  box: BoxData;
  color: string;
  /** Distance between two DOM levels in world units. */
  levelDistance: number;
  /** Distance between overlapping boxes of the same level in world units. */
  stackDistance: number;
  pixelScale: number;
  visible: boolean;
  setClickedNode: (node: Element | null) => void;
}) {
  const isSelected = box.isSubtreeRoot;
  const levelZ = box.level * levelDistance;
  // Overlapping boxes of the same level are slightly moved to the front to avoid flickering (z-fighting)
  const z = levelZ + box.stackIndex * stackDistance;
  const depth = isSelected ? pixelScale + levelDistance / 2 : pixelScale;

  // The text (HTML) of a node is shown while it is selected or hovered
  const [isHovered, setIsHovered] = useState(false);
  const showLabel = (isSelected || isHovered) && visible;

  // drei's <Html occlude="blending"> adds a plane that cuts the hole into the canvas through which the label is
  // visible. That plane must not catch the pointer, otherwise the label would block hovering and clicking the
  // boxes behind it (and the hovered box would lose its hover, i.e., the label would flicker).
  const labelGroupRef = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    labelGroupRef.current?.traverse((object) => {
      object.raycast = noRaycast;
    });
  });

  // drei centers the label at its position and sizes the occlusion (the hole in the canvas through which the
  // HTML is visible) to the label. Hence, the label is lifted by half of its measured height in 3D instead of
  // via CSS, so that it ends right above the box and does not overlap the selected node.
  const [labelHeight, setLabelHeight] = useState(0);
  const labelRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(() => setLabelHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const labelText =
    box.htmlWithText.length > MAX_LABEL_LENGTH ? box.htmlWithText.slice(0, MAX_LABEL_LENGTH) + '…' : box.htmlWithText;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    setClickedNode(isSelected ? null : box.htmlNode);
  };

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // The node belongs to the realm of the iframe, hence `instanceof HTMLElement` would be false
    const node = box.htmlNode as HTMLElement;
    if (typeof node.click === 'function') {
      node.click();
    }
  };

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] = useClickPreventionOnDoubleClick(
    handleClick,
    handleDoubleClick
  );

  return (
    <group visible={visible} onClick={handleClickWithPrevent} onDoubleClick={handleDoubleClickWithPrevent}>
      <mesh
        position={[box.position[0], box.position[1], z]}
        userData={{ isDomBox: true }}
        // three.js also raycasts invisible objects, a filtered out box must not catch clicks for the visible ones
        raycast={visible ? THREE.Mesh.prototype.raycast : noRaycast}
        onPointerOver={(event) => {
          // Only the front-most box under the pointer is hovered
          event.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={() => setIsHovered(false)}
      >
        <boxGeometry args={[box.size[0], box.size[1], depth]} />
        {/* Separate materials: three.js does not recompile a shader when `map` changes from null to a
            texture, so reusing one material would keep the box untextured. The rendered HTML is unlit
            and not tone mapped to keep the colors of the web page. */}
        {box.texture ? <meshBasicMaterial map={box.texture} toneMapped={false} /> : <meshToonMaterial color={color} />}
        <Edges linewidth={isSelected ? 5 : 1} color="black" />
      </mesh>
      {box.level !== 0 && (
        <Line
          points={[
            [box.position[0], box.position[1], z],
            [box.position[0], box.position[1], levelZ - levelDistance],
          ]}
          color="black"
          raycast={() => null}
        />
      )}
      {showLabel && (
        <group ref={labelGroupRef}>
          <Html
            transform
            occlude="blending"
            pointerEvents="none"
            scale={pixelScale * HTML_PIXELS_PER_UNIT}
            position={[
              box.position[0],
              box.position[1] + box.size[1] / 2 + (LABEL_GAP + labelHeight / 2) * pixelScale,
              z + depth / 2,
            ]}
          >
            <div
              ref={labelRef}
              className="web-view-node-label"
              // Hidden until measured to avoid a flash at the wrong position
              style={{ visibility: labelHeight ? 'visible' : 'hidden' }}
            >
              <code>{labelText}</code>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
