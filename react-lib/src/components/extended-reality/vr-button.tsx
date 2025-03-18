import { useState } from 'react';

interface VrButtonArgs {
  renderer: THREE.WebGLRenderer;
  onSessionStartedCallback?(session: XRSession): void;
  onSessionEndedCallback?(): void;
  debugMode: boolean;
}

export default function VrButton(args: VrButtonArgs) {
  const [vrSupported, setVrSupported] = useState<boolean>(false);
  const [buttonText, setButtonText] = useState<string>('Checking ...');

  //normaly both not tracked but didn't find a good alternative
  const [firstCall, setFirstCall] = useState<boolean>(true);
  const [currentSession, setCurrentSession] = useState<XRSession | null>(null);

  const updateVrStatus = async () => {
    if ('xr' in navigator) {
      setVrSupported(
        (await navigator.xr?.isSessionSupported('immersive-vr')) || false
      );

      if (vrSupported) {
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
      setFirstCall(false);
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
    setCurrentSession(session);

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

    setCurrentSession(null);
    setButtonText('Enter VR');

    if (args.onSessionEndedCallback) {
      args.onSessionEndedCallback();
    }
    setFirstCall(true);
  };

  const onClick = async () => {
    updateVrStatus();
    if (!vrSupported) return;

    if (!currentSession) {
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
        await currentSession.end();
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
