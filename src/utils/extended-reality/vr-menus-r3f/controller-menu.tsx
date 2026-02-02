import { useFrame } from '@react-three/fiber';
import { Container, Text } from '@react-three/uikit';
import { Button } from '@react-three/uikit-default';
import { useXRInputSourceState, XRSpace } from '@react-three/xr';
import { useState } from 'react';

export default function ControllerMenu({
  handedness = 'right' as 'left' | 'right',
}) {
  const [visible, setVisible] = useState(false);
  const controller = useXRInputSourceState('controller', handedness);
  const space =
    controller?.inputSource.gripSpace ?? controller?.inputSource.targetRaySpace;
  const buttonAX =
    controller?.gamepad[handedness === 'right' ? 'a-button' : 'x-button'];
  // const thumbstick = controller?.gamepad['xr-standard-thumbstick'];
  // const numberOfItems = 2;
  // let [selectedItem, setSelectedItem] = useState(0);

  useFrame(() => {
    // Handle button A/X (toggle visibilty)
    if (buttonAX?.state === 'pressed') {
      setVisible((v) => !v);
    }

    // Handle thumbstick (scroll through buttons)
    // if ((thumbstick?.yAxis ?? 0) > 0) {
    //   setSelectedItem(Math.abs((selectedItem + 1) % numberOfItems));
    // }
    // if ((thumbstick?.yAxis ?? 0) < 0) {
    //   setSelectedItem(Math.abs((selectedItem - 1) % numberOfItems));
    // }
  });

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
              <Button onClick={() => console.log('Button 1 clicked')}>
                <Text>Button 1</Text>
              </Button>
              <Button onClick={() => console.log('Button 2 clicked')}>
                <Text>Button 2</Text>
              </Button>
            </Container>
          </Container>
        )}
      </group>
    </XRSpace>
  );
}
