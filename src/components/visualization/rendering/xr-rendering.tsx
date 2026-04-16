import { createXRStore, XRStore } from '@react-three/xr';
import CanvasWrapper from 'explorviz-frontend/src/components/visualization/rendering/canvas-wrapper';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface XrRenderingProps {
  landscapeData: LandscapeData | null;
  onSessionStarted?: (session: XRSession) => void;
  onSessionEnded?: () => void;
}

export default function XrRendering({
  landscapeData,
  onSessionStarted,
  onSessionEnded,
}: XrRenderingProps) {
  const [xrStore] = useState<XRStore>(() =>
    createXRStore({
      controller: {
        teleportPointer: { rayModel: { color: 'red' } },
        rayPointer: { rayModel: { color: 'red' } },
      },
      hand: {
        teleportPointer: { rayModel: { color: 'blue' } },
        rayPointer: { rayModel: { color: 'blue' } },
      },
      offerSession: false,
    })
  );

  const [vrSupported, setVrSupported] = useState<boolean>(false);
  const [arSupported, setArSupported] = useState<boolean>(false);
  const [autoEnterAttempted, setAutoEnterAttempted] = useState<boolean>(false);

  const { autoEnterVr } = useUserSettingsStore(
    useShallow((state) => ({
      autoEnterVr: state.visualizationSettings.autoEnterVr.value,
    }))
  );

  useEffect(() => {
    // Check XR support
    const checkXRSupport = async () => {
      if ('xr' in navigator && navigator.xr) {
        const vrSupport = await navigator.xr.isSessionSupported('immersive-vr');
        const arSupport = await navigator.xr.isSessionSupported('immersive-ar');
        setVrSupported(vrSupport);
        setArSupported(arSupport);
      }
    };

    checkXRSupport();

    useVisualizationStore.getState().actions.setSceneLayers({
      Default: 0,
      Foundation: 0,
      District: 0,
      Building: 0,
      Communication: 0,
      Ping: 0,
      Label: 0,
      MinimapLabel: 0,
      LocalMinimapMarker: 0,
      MinimapMarkers: 0,
    });

    // Clean up store on unmount
    return () => {
      xrStore.getState().session?.end();
      useVisualizationStore.getState().actions.setSceneLayers({
        Default: 0,
        Foundation: 1,
        District: 2,
        Building: 3,
        Communication: 4,
        Ping: 5,
        Label: 6,
        MinimapLabel: 7,
        LocalMinimapMarker: 8,
        MinimapMarkers: 9,
      });
    };
  }, [xrStore]);

  // Auto-enter VR when everything is ready
  useEffect(() => {
    if (!autoEnterVr || autoEnterAttempted || !vrSupported || !landscapeData) {
      return;
    }

    let attemptCount = 0;
    const RETRY_INTERVAL = 250; // 250ms
    const MAX_ENTER_ATTEMPTS = 20; // Try for up to 5 seconds (20 * 250ms)

    const tryEnterVR = async () => {
      try {
        await xrStore.enterVR();
        setAutoEnterAttempted(true);
        return true;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('not connected to three.js')
        ) {
          // XR not ready yet, will retry
          return false;
        }
        // Other errors - log and stop trying
        console.error('Failed to auto-enter VR mode:', error);
        setAutoEnterAttempted(true);
        return true; // Stop retrying
      }
    };

    const retryInterval = setInterval(async () => {
      attemptCount++;
      const success = await tryEnterVR();

      if (success || attemptCount >= MAX_ENTER_ATTEMPTS) {
        clearInterval(retryInterval);
        if (attemptCount >= MAX_ENTER_ATTEMPTS && !autoEnterAttempted) {
          console.warn(
            'Could not auto-enter VR: XR system did not initialize in time'
          );
          setAutoEnterAttempted(true);
        }
      }
    }, RETRY_INTERVAL);

    return () => {
      clearInterval(retryInterval);
    };
  }, [autoEnterVr, vrSupported, landscapeData, xrStore, autoEnterAttempted]);

  // Handle session lifecycle callbacks
  useEffect(() => {
    const currentSession = xrStore.getState().session;

    if (currentSession) {
      if (onSessionStarted) {
        onSessionStarted(currentSession);
      }

      // Listen for session end
      const handleSessionEnd = () => {
        if (onSessionEnded) {
          onSessionEnded();
        }
      };

      currentSession.addEventListener('end', handleSessionEnd);

      return () => {
        currentSession.removeEventListener('end', handleSessionEnd);
      };
    }
  }, [xrStore, onSessionStarted, onSessionEnded]);

  const enterVR = async () => {
    if (vrSupported) {
      await xrStore.enterVR();
    }
  };

  const enterAR = async () => {
    if (arSupported) {
      await xrStore.enterAR();
    }
  };

  return (
    <>
      <CanvasWrapper landscapeData={landscapeData} xrStore={xrStore} />
      <div className="xr-controls">
        {vrSupported && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={enterVR}
            disabled={!landscapeData}
          >
            Enter VR
          </button>
        )}
        {arSupported && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={enterAR}
            disabled={!landscapeData}
          >
            Enter AR
          </button>
        )}
      </div>
    </>
  );
}
