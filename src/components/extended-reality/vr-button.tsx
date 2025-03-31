import { useRef, useState } from 'react';

interface VrButtonArgs {
  renderer: THREE.WebGLRenderer;
  onSessionStartedCallback?(session: XRSession): void;
  onSessionEndedCallback?(): void;
  debugMode: boolean;
}

export default function VrButton(args: VrButtonArgs) {
  const [vrSupported, setVrSupported] = useState<boolean>(false);
  const [buttonText, setButtonText] = useState<string>('Checking ...');

  const firstCall = useRef<boolean>(true);
  const currentSession = useRef<XRSession | null>(null);

  const updateVrStatus = async () => {
    if ('xr' in navigator) {
      const isVrSupported = await navigator.xr?.isSessionSupported('immersive-vr') || false
      setVrSupported(
        isVrSupported
      );

      if (isVrSupported) {
        setButtonText('Enter VR');
      } else if (!window.isSecureContext) {
        setButtonText('WEBXR NEEDS HTTPS');
      } else {
        setButtonText('WEBXR NOT AVAILABLE');
      }
    } else {
      setButtonText('WEBXR NOT SUPPORTED');
    }

    if (!args.debugMode && firstCall) {
      firstCall.current = false;
      onClick();
    }
  };

  /**
   * Called whenever a WebXR session is started.
   * Adds the session to the renderer, sets button text and
   * registers listenders + callback functions.
   *
   * @param session
   */
  const onSessionStarted = (session: any) => {
    args.renderer.xr.setSession(session);
    setButtonText('EXIT VR');
    currentSession.current = session;

    if (args.onSessionStartedCallback) {
      args.onSessionStartedCallback(session);
    }
  };

  /**
   * Called whenever a WebXR session ends.
   * Removes listeners, updates button text and triggers
   * registered callback function.
   */
  const onSessionEnded = () => {
    if (!currentSession) return;

    currentSession.current = null;
    setButtonText('Enter VR');

    if (args.onSessionEndedCallback) {
      args.onSessionEndedCallback();
    }
    firstCall.current = true;
  };

  const onClick = async () => {
    updateVrStatus();
    if (!vrSupported) return;

    if (!currentSession.current) {
      const sessionInit = { optionalFeatures: ['local-floor'] };
      try {
        const session = await navigator.xr?.requestSession(
          'immersive-vr',
          sessionInit
        );
        onSessionStarted(session);
      } catch (error) {
        console.error('ERROR: VR Session already existing');
      }
    } else {
      try {
        await currentSession.current!.end();
      } catch (error) {
        console.error('ERROR: VR Session already ended');
      }

      if (args.debugMode) onSessionEnded();
    }
  };

  return (
    <button
      className="vr-button"
      type="button"
      onClick={onClick}
      ref={updateVrStatus}
    >
      {buttonText}
    </button>
  );
}
