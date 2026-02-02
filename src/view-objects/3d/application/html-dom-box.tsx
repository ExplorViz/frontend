import { Box, Edges, Html, Line } from '@react-three/drei';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { BoxData } from 'explorviz-frontend/src/view-objects/3d/application/html-visualizer';
import { useRef, useState } from 'react';
import * as THREE from 'three';

export default function HtmlDomBox({
  box,
  color,
  distanceBetweenLevels,
  visible,
  setClickedNode,
}: {
  box: BoxData;
  color: string;
  distanceBetweenLevels: number;
  visible: boolean;
  setClickedNode: any;
}) {
  const [clicked, setClicked] = useState(box.isSubtreeRoot);

  const meshRef = useRef<THREE.Group | null>(null);

  const handlePointerStop = (/*event: ThreeEvent<PointerEvent>*/) => {
    // TODO: Add popup
  };

  const pointerStopHandlers = usePointerStop(handlePointerStop, 50);

  const handleClick = () => {
    setClicked(!clicked);
    if (clicked) {
      setClickedNode(null);
    } else {
      setClickedNode(box.htmlNode);
    }
  };

  const handleDoubleClick = () => {
    if (box.htmlNode instanceof HTMLElement) {
      box.htmlNode.click();
    }
  };

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  return (
    <group
      position={[300, 218, 0]}
      visible={visible}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      ref={meshRef}
      {...pointerStopHandlers}
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
          <boxGeometry
            args={[
              box.size[0],
              box.size[1],
              box.size[2] + distanceBetweenLevels / 2,
            ]}
          />
        )}
        <meshToonMaterial
          map={box.texture}
          color={box.texture ? 'white' : color}
          transparent={true}
          opacity={1}
        />
        {(clicked || box.isSubtreeRoot) && (
          <Edges linewidth={5} scale={1} color="black" />
        )}
        {!clicked && <Edges linewidth={1} scale={1} color="black" />}
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
          raycast={() => {}}
        />
      )}
      {(clicked || box.isSubtreeRoot) && (
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
