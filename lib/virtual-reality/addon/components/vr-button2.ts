import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

interface VrButtonArgs {
  renderer: THREE.WebGLRenderer;
  onSessionStartedCallback?(session: XRSession): void;
  onSessionEndedCallback?(): void;
}

export default class VrButton {
  currentSession: XRSession | null = null;

  @tracked
  vrSupported = false;

  @tracked
  buttonText: string = 'Checking ...';

  renderer!: THREE.WebGLRenderer;
  onSessionStartedCallback?(session: XRSession): void;
  onSessionEndedCallback?(): void;

  constructor({renderer, onSessionStartedCallback, onSessionEndedCallback} : VrButtonArgs){
    this.renderer = renderer;
    this.onSessionStartedCallback = onSessionStartedCallback;
    this.onSessionEndedCallback = onSessionEndedCallback;
  }

  /**
   * Checks the current status of WebXR in the browser and if compatible
   * devices are connected. Sets the tracked properties
   * 'buttonText' and 'vrSupported' accordingly.
   */
  @action
  async updateVrStatus() {
    if ('xr' in navigator) {
      this.vrSupported =
        (await navigator.xr?.isSessionSupported('immersive-vr')) || false;

      if (this.vrSupported) {
        this.buttonText = 'Enter VR';
      } else if (window.isSecureContext === false) {
        this.buttonText = 'WEBXR NEEDS HTTPS';
      } else {
        this.buttonText = 'WEBXR NOT AVAILABLE';
      }
    } else {
      this.buttonText = 'WEBXR NOT SUPPORTED';
    }
  }

  /**
   * Called whenever a WebXR session is started.
   * Adds the session to the renderer, sets button text and
   * registers listenders + callback functions.
   *
   * @param session
   */
  onSessionStarted(session: any) {
    this.renderer.xr.setSession(session);
    this.buttonText = 'EXIT VR';

    this.currentSession = session;

    if (this.onSessionStartedCallback) {
      this.onSessionStartedCallback(session);
    }
  }

  /**
   * Called whenever a WebXR session ends.
   * Removes listeners, updates button text and triggers
   * registered callback function.
   */
  onSessionEnded() {
    if (!this.currentSession) return;

    this.currentSession = null;

    this.buttonText = 'ENTER VR';

    if (this.onSessionEndedCallback) {
      this.onSessionEndedCallback();
    }
  }

  @action
  async onClick() {
    this.updateVrStatus();
    if (!this.vrSupported) return;

    console.log("NACH DEM ERSTEN RETURN");

    if (!this.currentSession) {
      const sessionInit = { optionalFeatures: ['local-floor'] };
      const session = await navigator.xr?.requestSession(
        'immersive-vr',
        sessionInit
      );
      this.onSessionStarted(session);
    } else {
      await this.currentSession.end();
      this.onSessionEnded();
    }
  }
}
