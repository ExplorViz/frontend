import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { useLandscapeTokenStore } from 'react-lib/src/stores/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import { useSnapshotTokenStore } from 'react-lib/src/stores/snapshot-token';
import RenderingService from 'explorviz-frontend/services/rendering-service';
import { useAuthStore } from 'react-lib/src/stores/auth';

export default class Navbar extends Component {
  @service('router')
  router!: any;

  user = useAuthStore.getState().user;

  landscapeToken = useLandscapeTokenStore.getState().token;

  @service('rendering-service')
  renderingService!: RenderingService;

  @action
  logout() {
    // useAuthStore.getState().logout(); // TODO: Gibt es nicht mehr
  }

  @action
  goToLandscapeSelection() {
    useSnapshotTokenStore.getState().snapshotSelected = false;
    useLandscapeTokenStore.getState().setToken(null);
    useSnapshotTokenStore.getState().setToken(null);
    this.router.transitionTo('landscapes', {
      queryParams: { landscapeToken: undefined },
    });
  }

  @action
  goToVisualization() {
    if (useSnapshotTokenStore.getState().latestSnapshotToken !== null) {
      useSnapshotTokenStore.getState().setToken(useSnapshotTokenStore.getState().latestSnapshotToken);
      this.router.transitionTo('visualization', {
        queryParams: {
          landscapeToken:
            useSnapshotTokenStore.getState().latestSnapshotToken!.landscapeToken.value,
          sharedSnapshot: useSnapshotTokenStore.getState().latestSnapshotToken!.isShared,
          owner: useSnapshotTokenStore.getState().latestSnapshotToken!.owner,
          createdAt: useSnapshotTokenStore.getState().latestSnapshotToken!.createdAt,
        },
      });
    } else {
      this.router.transitionTo('visualization', {
        queryParams: {
          landscapeToken: useLandscapeTokenStore.getState().token!.value,
        },
      });
    }
  }

  @action
  goToSettings() {
    useLandscapeTokenStore.getState().setToken(null);
    useSnapshotTokenStore.getState().snapshotSelected = false;
    useSnapshotTokenStore.getState().setToken(null);
    this.router.transitionTo('settings', {
      queryParams: {
        landscapeToken: undefined,
      },
    });
  }

  get analysisMode() {
    let currentAnalysisMode = this.renderingService.analysisMode;

    currentAnalysisMode =
      'Active mode: ' +
      currentAnalysisMode.charAt(0).toUpperCase() +
      currentAnalysisMode.slice(1);

    return currentAnalysisMode;
  }

  get isSingleLandscapeMode() {
    return (
      ENV.mode.tokenToShow.length > 0 && ENV.mode.tokenToShow !== 'change-token'
    );
  }

  get versionTag() {
    return ENV.version.versionTag;
  }
}
