import { Box, Html } from '@react-three/drei';
import { Container, Root } from '@react-three/uikit';
import { Button, Input } from '@react-three/uikit-default';
import { ChevronLeft, SkipBack, Table } from '@react-three/uikit-lucide';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import BabiaHtml from 'explorviz-frontend/src/view-objects/3d/application/babia-html';
import { useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function EmbeddedBrowser() {
  const iFrameRef = useRef<HTMLIFrameElement>(null);
  const localHtmlContent = useRef<string>('');
  const isWatching = useRef(false);
  const [html, setHtml] = useState<HTMLElement | undefined>(undefined);
  const defaultUrl = 'http://localhost:4200';
  const [url, setUrl] = useState<string>(defaultUrl);

  const sizeX = 1000;
  const sizeY = 1000;
  const scale = 0.5;
  const positionBottom = -500 * scale;
  const positionLeft = 700 * scale + 150;
  const navbarHeight = 40;
  const inputWidth = 450;

  const toastHandlerActions = useToastHandlerStore(
    useShallow((state) => ({
      showErrorToastMessage: state.showErrorToastMessage,
    }))
  );

  const triggerHtmlVisualizer = useCallback(() => {
    if (html) {
      setHtml(undefined);
      return;
    }

    updateHtml();
  }, [html]);

  const watchHtmlFile = (fileUrl: string, interval = 500) => {
    async function checkForChanges() {
      console.log('Start watching', fileUrl);

      isWatching.current = true;
      try {
        const response = await fetch(fileUrl, {
          cache: 'no-cache', // Prevents browser caching, ensuring we get the latest version
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
          return;
        }

        const currentContent = await response.text();

        if (localHtmlContent.current === '') {
          // First run: initialize cached content
          localHtmlContent.current = currentContent;
          console.log(`Watching ${fileUrl} for changes...`);
        } else if (currentContent !== localHtmlContent.current) {
          // File has changed
          console.log(`${fileUrl} has changed!`);
          iFrameRef.current?.contentWindow.location.reload();
          // Perform your actions here (e.g., update UI, reload data)
          localHtmlContent.current = currentContent; // Update cached content
        } else {
          updateHtml();
          // File has not changed
          //console.log(`${fileUrl} is unchanged.`); //Optional logging
        }
      } catch (error) {
        console.error(`Error checking for changes in ${fileUrl}:`, error);
      }

      if (fileUrl === url) {
        setTimeout(() => {
          checkForChanges();
        }, interval);
      } else {
        console.log('URLs do not match');

        isWatching.current = false;
      }
    }

    if (!isWatching.current) {
      checkForChanges();
    }
  };

  // useEffect(() => {
  //   if (url.includes('.html')) {
  //     watchHtmlFile(url);
  //   }
  // }, [url]);

  const updateHtml = useCallback(() => {
    let iFrameHtml: HTMLElement | undefined;
    try {
      iFrameHtml = iFrameRef.current?.contentWindow?.document.getRootNode();
    } catch (error) {
      console.log(error);
      toastHandlerActions.showErrorToastMessage('Could not inspect iFrame');
      setHtml(undefined);
      return;
    }
    setHtml(iFrameHtml);
  }, [html]);

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
          <Container></Container>
        </Container>
      </Root>
      <Html
        scale={scale * 11.5}
        position={[140, 142, 1]}
        style={{ userSelect: 'none' }}
        castShadow
        receiveShadow
        occlude="blending"
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
      {<BabiaHtml html={html} updateHtml={updateHtml} />}
    </>
  );
}
