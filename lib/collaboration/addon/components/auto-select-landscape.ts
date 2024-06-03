import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import LandscapeTokenService, {
  LandscapeToken,
} from 'explorviz-frontend/services/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import SnapshotTokenService from 'explorviz-frontend/services/snapshot-token';
interface AutoSelectLandscapeArgs {
  roomId: string;
  landscapeToken: string;
}

const { userService } = ENV.backendAddresses;

export default class AutoSelectLandscape extends Component<AutoSelectLandscapeArgs> {
  @service('router')
  private router!: any;

  @service('landscape-token')
  private tokenService!: LandscapeTokenService;

  @service('snapshot-token')
  private snapshotService!: SnapshotTokenService;

  @service('auth')
  auth!: Auth;

  autoSelectCallback: any;

  constructor(owner: unknown, args: AutoSelectLandscapeArgs) {
    super(owner, args);

    // Authentication might take some time and is needed to request landscape token
    if (this.auth.user) {
      this.autoSelectLandscape();
    } else {
      this.autoSelectCallback = this.autoSelectLandscape.bind(this);
      this.auth.on('user_authenticated', this.autoSelectCallback);
    }
  }

  // Create task to handle async calls on room handling
  async autoSelectLandscape() {
    /** For some reason the queryparameter sharedSnapshot is always undefined in the application controller. This works fine
     * in the visualization controller. Also it is not possible to have the same queryParameters in two controllers. This can be
     * handles with "owner: {as other-owner}". But if I want to set other-owner = null, the queryParameter is not set to null and
     * if the route changes, the url does not change. Therefore, queryParams is used here
     */
    const queryParams = this.router.currentRoute.queryParams;

    if (
      queryParams.owner &&
      queryParams.createdAt &&
      queryParams.sharedSnapshot !== undefined
    ) {
      const token = await this.snapshotService.retrieveToken(
        queryParams.owner,
        queryParams.createdAt,
        queryParams.sharedSnapshot
      );

      this.snapshotService.setToken(token);
      this.router.transitionTo('visualization');
    } else {
      if (
        !this.args.landscapeToken ||
        this.tokenService.token?.value === this.args.landscapeToken
      ) {
        return;
      }
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

  willDestroy(): void {
    if (this.autoSelectCallback) {
      this.auth.off('user_authenticated', this.autoSelectCallback);
    }
  }
}
