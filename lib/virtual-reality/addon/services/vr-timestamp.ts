import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Auth from 'explorviz-frontend/services/auth';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import DetachedMenuGroupService from 'virtual-reality/services/detached-menu-groups';
import LocalVrUser from 'virtual-reality/services/local-vr-user';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import VrApplicationRenderer from './vr-application-renderer';

export default class VrTimestampService extends Service {
  private debug = debugLogger('VrTimestampService');

  @service('auth')
  private auth!: Auth;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupService;

  @service('landscape-token')
  private landscapeTokenService!: LandscapeTokenService;

  @service('local-vr-user')
  private localUser!: LocalVrUser;

  @service('reload-handler')
  private reloadHandler!: ReloadHandler;

  @service('vr-application-renderer')
  private applicationRenderer!: VrApplicationRenderer;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @tracked
  timestamp!: number;

  async updateLandscapeTokenLocally(
    landscapeToken: string,
    timestamp: number,
  ): Promise<void> {
    // While changing the timestamp, we overwrite the landscape token temporarily sucht
    // that the given landscape is loaded instead.
    const originalToken = this.landscapeTokenService.token;
    this.landscapeTokenService.setToken({
      alias: 'Temporary VR Token',
      created: new Date().getTime(),
      ownerId: this.auth.user?.sub || '',
      value: landscapeToken,
      sharedUsersIds: [],
    });

    await this.updateTimestampLocally(timestamp);

    // Reset to original landscape token. When there was no token before the landscape was
    // changed, just remove the temporary token.
    if (originalToken) {
      this.landscapeTokenService.setToken(originalToken);
    } else {
      this.landscapeTokenService.removeToken();
    }
  }

  updateTimestamp(timestamp: number): Promise<void> {
    if (this.localUser.isOnline) {
      this.sender.sendTimestampUpdate(timestamp);
    }
    return this.updateTimestampLocally(timestamp);
  }

  async updateTimestampLocally(timestamp: number): Promise<void> {
    try {
      // Load new landscape data.
      const [
        structureData,
        dynamicData,
      ] = await this.reloadHandler.loadLandscapeByTimestamp(timestamp);
      await this.setTimestampLocally(timestamp, structureData, dynamicData);
    } catch (e) {
      this.debug("Landscape couldn't be requested!", e);
    }
  }

  async setTimestampLocally(
    timestamp: number,
    structureLandscapeData: StructureLandscapeData,
    dynamicLandscapeData: DynamicLandscapeData,
  ): Promise<void> {
    this.timestamp = timestamp;

    this.debug('SetTimestapLocallyStart:' + timestamp)
    await Promise.all([
      await perform(this.landscapeRenderer.populateLandscape, structureLandscapeData, dynamicLandscapeData),
      this.applicationRenderer.updateLandscapeData(
        structureLandscapeData,
        dynamicLandscapeData,
      ),
      this.detachedMenuGroups.updateLandscapeData(),
    ]);
    this.debug('SetTimestapLocallyDone:' + timestamp)
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-timestamp': VrTimestampService;
  }
}
