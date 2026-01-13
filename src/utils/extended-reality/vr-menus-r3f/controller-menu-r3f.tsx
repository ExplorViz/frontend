import { useFrame } from '@react-three/fiber';
import { Container, Text } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { useXRInputSourceState, XRSpace } from '@react-three/xr';
import { useEffect, useState } from 'react';

export default function ControllerMenu({
  handedness = 'right' as 'left' | 'right',
}) {
  const [visible, setVisible] = useState(true);
  const controller = useXRInputSourceState('controller', handedness);
  const space =
    controller?.inputSource.gripSpace ?? controller?.inputSource.targetRaySpace;
  const [toggleColor, setToggleColor] = useState(true);
  const buttonAX =
    controller?.gamepad[handedness === 'right' ? 'a-button' : 'x-button'];
  const thumbstick = controller?.gamepad['xr-standard-thumbstick'];
  const numberOfItems = 2;
  let selectedItem = 0;

  // Handle button A/X (toggle visibilty)
  useFrame(() => {
    if (buttonAX?.state === 'pressed') {
      setVisible((v) => !v);
    }
  });

  // Handle thumbstick (scroll)
  useEffect(() => {
    if (controller == null || thumbstick == null) {
      return;
    }
    // Thumbstick moves up, scroll up
    if ((thumbstick.yAxis ?? 0) > 0) {
      selectedItem = Math.abs((selectedItem + 1) % numberOfItems);
    }
    // Thumbstick moves down, scroll down
    if ((thumbstick.yAxis ?? 0) < 0) {
      selectedItem = Math.abs((selectedItem - 1) % numberOfItems);
    }
  }, [thumbstick?.yAxis]);

  if (!space) return null;

  return (
    <XRSpace space={space}>
      <group
        position={[0, 0.15, -0.15]}
        rotation={[(340 * Math.PI) / 180, 0, 0]}
      >
        {visible && (
          <Container
            sizeX={0.2}
            sizeY={0.2}
            pixelSize={0.001}
            backgroundColor="black"
          >
            <Container overflow="scroll">
              <Text fontSize={22} color="white">
                Menu
              </Text>
              <Button
                onClick={() => setToggleColor(!toggleColor)}
                backgroundColor={toggleColor ? 'blue' : 'green'}
                borderColor="white"
                borderWidth={selectedItem === 0 ? 1 : 0}
              >
                <Text>Button 1</Text>
              </Button>
              <Button
                onClick={() => setToggleColor(!toggleColor)}
                backgroundColor={toggleColor ? 'yellow' : 'red'}
                borderColor="white"
                borderWidth={selectedItem === 1 ? 1 : 0}
              >
                <Text>Button 2</Text>
              </Button>
            </Container>
          </Container>
        )}
      </group>
    </XRSpace>
  );
}
