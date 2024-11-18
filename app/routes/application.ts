import Route from '@ember/routing/route';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { inject as service } from '@ember/service';
import Auth from 'explorviz-frontend/services/auth';
import SnapshotTokenService from 'explorviz-frontend/services/snapshot-token';

/**
 * TODO
 *
 * @class ApplicationRoute
 * @extends Route
 */
export default class ApplicationRoute extends Route {
  @service
  auth!: Auth;

  @service('landscape-token')
  landscapeToken!: LandscapeTokenService;

  @service('snapshot-token')
  snapshotToken!: SnapshotTokenService;
}
