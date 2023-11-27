import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
interface AutoSelectLandscapeArgs {
  roomId: string;
  landscapeToken: string;
}

const { userService } = ENV.backendAddresses;

/**
 * Heart of the automatic initiation of the synchronization feature.
 * Effectivly setting up SychronizationSession and providing access to
 * projector identification and specific collaboration session via query parameter.
 */
export default class AutoSelectLandscape extends Component<AutoSelectLandscapeArgs> {
  @service('router')
  private router!: any;

  @service('landscape-token')
  private tokenService!: LandscapeTokenService;

  @service('auth')
  auth!: Auth;

  // Create task to handle async calls on room handling
  async setUpLandscapeSelection() {
    try {
      const tokens = await this.getLandscapeTokens();
      const selectedToken = tokens.find(
        (token) => token.value === this.args.landscapeToken
      );

      if (selectedToken) {
        this.tokenService.setToken(selectedToken);
        this.router.transitionTo('visualization');
      } else {
        // Token not found => remove faulty query param
        this.router.transitionTo({
          queryParams: { landscapeToken: undefined },
        });
      }
    } catch (error) {
      console.error('Error in setUpLandscapeSelection:', error);
    }
  }

  async getLandscapeTokens() {
    const uId = this.auth.user?.sub;

    if (!uId) {
      throw new Error('Could not find user');
    }

    const encodedUid = encodeURI(uId);
    const response = await fetch(`${userService}/user/${encodedUid}/token`, {
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Bad response from user service');
    }

    return (await response.json()) as LandscapeToken[];
  }

  checkForLandscape() {
    if (
      this.args.landscapeToken &&
      this.tokenService.token?.value !== this.args.landscapeToken
    ) {
      this.setUpLandscapeSelection();
    }
  }

  constructor(owner: unknown, args: AutoSelectLandscapeArgs) {
    super(owner, args);

    // Authentication might take some time and is needed to request landscape token
    if (this.auth.user) {
      this.checkForLandscape();
    } else {
      this.auth.on('user_authenticated', this.checkForLandscape.bind(this));
    }
  }

  willDestroy(): void {
    this.auth.off('use_authenticated', this.checkForLandscape);
  }
}
