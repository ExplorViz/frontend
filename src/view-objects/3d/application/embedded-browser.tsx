import { Box, Html } from '@react-three/drei';
import { Container, Root } from '@react-three/uikit';
import { Input } from '@react-three/uikit-default';
import { Button } from '@react-three/uikit-default';
import { ChevronLeft, SkipBack, Table } from '@react-three/uikit-lucide';
import BabiaHtml from 'explorviz-frontend/src/view-objects/3d/application/babia-html';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useRef, useState } from 'react';

export default function EmbeddedBrowser({
  appLayout,
}: {
  appLayout: BoxLayout;
}) {
  const iFrameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<HTMLElement | undefined>(undefined);
  const defaultUrl = 'http://localhost:4200';
  const [url, setUrl] = useState<string>(defaultUrl);

  const sizeX = 1000;
  const sizeY = 1000;
  const scale = 0.5;
  const positionBottom = -500 * scale;
  const positionLeft = 700 * scale + appLayout.width * scale;
  const navbarHeight = 40;
  const inputWidth = 450;

  const triggerHtmlVisualizer = () => {
    if (html) {
      setHtml(undefined);
      return;
    }

    let iFrameHtml: HTMLElement | undefined;
    try {
      iFrameHtml =
        iFrameRef.current?.contentWindow?.document.getElementsByTagName(
          'html'
        )[0];
    } catch (error) {
      console.log(error);
      setHtml(undefined);
      return;
    }
    setHtml(iFrameHtml?.getElementsByTagName('body')[0]);
  };

  return (
    <>
      <Box position={[142, 155, -1]} args={[290, 200, 1]} />
      <Root
        positionBottom={positionBottom}
        positionLeft={positionLeft}
        sizeX={sizeX}
        sizeY={sizeY}
        pixelSize={scale}
      >
        <Container flexDirection="row" alignItems="flex-start" gap={10}>
          <Input
            onValueChange={(value) => {
              setUrl(value);
            }}
            width={inputWidth}
            height={navbarHeight}
            value={url}
          />
          <Button
            width={navbarHeight}
            height={navbarHeight}
            padding={0}
            onClick={() => {
              // Reset URL (add or remove '/' to trigger rendering)
              if (url === defaultUrl) {
                setUrl(defaultUrl + '/');
              } else {
                setUrl(defaultUrl);
              }
            }}
          >
            <SkipBack />
          </Button>
          <Button
            width={navbarHeight}
            height={navbarHeight}
            padding={0}
            onClick={(event) => {
              triggerHtmlVisualizer();
            }}
          >
            {html ? <ChevronLeft /> : <Table />}
          </Button>
          <Container>
            <Html
              scale={scale * 11.5}
              position={[
                scale * -280 + positionLeft * scale,
                scale * -220 + positionBottom * scale,
                0,
              ]}
              style={{ userSelect: 'none' }}
              castShadow
              receiveShadow
              transform
            >
              {url && (
                <iframe
                  title="embed"
                  width={1920}
                  height={1080}
                  src={url}
                  sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
                  ref={iFrameRef}
                />
              )}
            </Html>
          </Container>
        </Container>
      </Root>
      {<BabiaHtml html={html} />}
    </>
  );
}
