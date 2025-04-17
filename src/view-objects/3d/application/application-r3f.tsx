import { Html } from '@react-three/drei';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import BabiaHtml from 'explorviz-frontend/src/view-objects/3d/application/babia-html';
import ClassR3F from 'explorviz-frontend/src/view-objects/3d/application/class-r3f';
import ComponentR3F from 'explorviz-frontend/src/view-objects/3d/application/component-r3f';
import FoundationR3F from 'explorviz-frontend/src/view-objects/3d/application/foundation-r3f';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ApplicationR3F({
  applicationData,
}: {
  applicationData: ApplicationData;
}) {
  const iFrameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<HTMLElement | undefined>(undefined);

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === 'b') {
        const iFrameHtml =
          iFrameRef.current?.contentWindow?.document.getElementsByTagName(
            'html'
          )[0];
        if (html) {
          handleStuff(undefined);
        } else {
          handleStuff(iFrameHtml);
        }
        console.log('Set html');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleStuff = (html) => {
    setHtml(html);
  };

  const applicationRendererState = useApplicationRendererStore(
    useShallow((state) => ({
      addApplicationTask: state.addApplicationTask,
    }))
  );

  const [app3D, setApp3D] = useState<ApplicationObject3D | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  const computeApp = useCallback(async () => {
    const application3D =
      await applicationRendererState.addApplicationTask(applicationData);
    setApp3D(application3D);
    setPackages(applicationData.getPackages());
    setClasses(applicationData.getClasses());
  }, [applicationData, applicationRendererState]);

  useEffect(() => {
    computeApp();
  }, [applicationData, computeApp]);

  return (
    <>
      {app3D && (
        <primitive object={app3D}>
          <Html
            position={[app3D.layout.depth / 2, app3D.layout.depth / 2, 0]}
            scale={app3D.layout.width / 50}
            style={{ userSelect: 'none' }}
            castShadow
            receiveShadow
            occlude="blending"
            transform
          >
            <iframe
              onClick={() => {
                console.log('click');
              }}
              title="embed"
              width={1920}
              height={1080}
              src="http://localhost:4200"
              sandbox="allow-scripts allow-popups allow-same-origin"
              ref={iFrameRef}
            />
          </Html>
          {html && <BabiaHtml html={html} />}
          <FoundationR3F
            application={applicationData.application}
            boxLayout={app3D.layout}
          />
          {packages?.map((packageData) => (
            <ComponentR3F
              key={packageData.id}
              component={packageData}
              appLayout={app3D.layout}
              layout={app3D.getBoxLayout(packageData.id)!}
            />
          ))}
          {classes?.map((classData) => (
            <ClassR3F
              key={classData.id}
              dataModel={classData}
              layout={app3D.getBoxLayout(classData.id)!}
            />
          ))}
        </primitive>
      )}
    </>
  );
}
