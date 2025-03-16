import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { useLandscapeTokenStore, LandscapeToken } from 'react-lib/src/stores/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import { useSnapshotTokenStore } from 'react-lib/src/stores/snapshot-token';
import { useAuthStore } from 'react-lib/src/stores/auth';
interface AutoSelectLandscapeArgs {
  roomId: string;
  landscapeToken: string;
}

const { userService } = ENV.backendAddresses;

export default class AutoSelectLandscape extends Component<AutoSelectLandscapeArgs> {
  @service('router')
  private router!: any;

  autoSelectCallback: any;

  constructor(owner: unknown, args: AutoSelectLandscapeArgs) {
    super(owner, args);

    // Authentication might take some time and is needed to request landscape token
    if (useAuthStore.getState().user) {
      this.autoSelectLandscape();
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
      const token = await useSnapshotTokenStore.getState().retrieveToken(
        queryParams.owner,
        queryParams.createdAt,
        queryParams.sharedSnapshot
      );

      useSnapshotTokenStore.getState().setToken(token);
      this.router.transitionTo('visualization');
    } else {
      if (
        !this.args.landscapeToken ||
        useLandscapeTokenStore.getState().token?.value === this.args.landscapeToken
      ) {
        return;
      }
      try {
        const tokens = await this.getLandscapeTokens();
        const selectedToken = tokens.find(
          (token) => token.value === this.args.landscapeToken
        );

        if (selectedToken) {
          useLandscapeTokenStore.getState().setToken(selectedToken);
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
    const uId = useAuthStore.getState().user?.sub;

    if (!uId) {
      throw new Error('Could not find user');
    }

    const encodedUid = encodeURI(uId);
    const response = await fetch(`${userService}/user/${encodedUid}/token`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Bad response from user service');
    }

    return (await response.json()) as LandscapeToken[];
  }
}
