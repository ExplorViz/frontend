import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface VrButtonArgs {
  renderer: THREE.WebGLRenderer;
  onSessionStartedCallback?(session: XRSession): void;
  onSessionEndedCallback?(): void;
  debugMode: boolean;
}

export default class VrButton extends Component<VrButtonArgs> {
  currentSession: XRSession | null = null;

  @tracked
  vrSupported = false;

  @tracked
  buttonText: string = 'Checking ...';

  firstCall: boolean = true;

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

    if (!this.args.debugMode && this.firstCall) {
      this.firstCall = false;
      this.onClick();
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
    this.args.renderer.xr.setSession(session);
    this.buttonText = 'EXIT VR';

    this.currentSession = session;

    if (this.args.onSessionStartedCallback) {
      this.args.onSessionStartedCallback(session);
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

    this.buttonText = 'Enter VR';

    if (this.args.onSessionEndedCallback) {
      this.args.onSessionEndedCallback();
    }

    this.firstCall = true;
  }

  @action
  async onClick() {
    this.updateVrStatus();
    if (!this.vrSupported) return;

    if (!this.currentSession) {
      const sessionInit = { optionalFeatures: ['local-floor'] };
      try {
        const session = await navigator.xr?.requestSession(
          'immersive-vr',
          sessionInit
        );
        this.onSessionStarted(session);
      } catch (error) {
        console.error('ERROR: VR Session already existing');
      }
    } else {
      try {
        await this.currentSession.end();
      } catch (error) {
        console.error('ERROR: VR Session already ended');
      }

      if (this.args.debugMode) this.onSessionEnded();
    }
  }
}
