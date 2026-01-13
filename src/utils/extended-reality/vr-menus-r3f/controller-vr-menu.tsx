import { useXRInputSourceState, XRSpace } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import { Container, Text } from '@react-three/uikit';
import { useState } from 'react';
import { Button } from '@react-three/uikit-default';

export default function ControllerMenu({ handedness = 'right' as 'left' | 'right' }) {
  const [visible, setVisible] = useState(false);
  const controller = useXRInputSourceState('controller', handedness);
  const gripSpace = controller?.inputSource.gripSpace;
  const buttonAX = controller?.gamepad[(handedness === 'right') ? 'a-button' : 'x-button'];
  // const thumbstick = controller?.gamepad['xr-standard-thumbstick'];
  // const numberOfItems = 2;
  // let [selectedItem, setSelectedItem] = useState(0);

  useFrame(() => {
    // Handle button A/X (toggle visibilty)
    if (buttonAX?.state === "pressed") {
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

  if (!gripSpace) return null;

  return (
    <XRSpace space={gripSpace}>
      <group position={[0, 0, 0.7]}>
        {visible && (
          <Container 
            sizeX={0.2} 
            sizeY={0.2} 
            pixelSize={0.001}
            backgroundColor="black"
          >
            <Container overflow="scroll">
              <Text fontSize={22} color="white">Menu</Text>
              <Button 
                onClick={() => console.log('Button 1 clicked')} 
              >
                <Text>Button 1</Text>
              </Button>
              <Button
                onClick={() => console.log('Button 2 clicked')}
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