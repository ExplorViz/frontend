import Service, { inject as service } from '@ember/service';
// import { tracked } from '@glimmer/tracking';
// import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import ToastHandlerService from './toast-handler';
import { LandscapeToken } from './landscape-token';

export type SnapshotToken = {
  id: number;
  name: string;
  landscapeToken: LandscapeToken;
  owner: string;
  createdAt: number;
  configuration: any;
  camera: any;
  annotation: any;
  isShared: boolean;
  deleteAt?: number;
};

//const { userService } = ENV.backendAddresses;

export default class SnapshotTokenService extends Service {
  @service('auth')
  private auth!: Auth;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  retrieveTokens(): SnapshotToken[] {
    //uncomment when backend is implemented

    // return new Promise<SnapShotToken[]>((resolve, reject) => {
    //   const userId = encodeURI(this.auth.user?.sub || '');
    //   if (!userId) {
    //     resolve([]);
    //   }

    //   fetch(`${userService}/user/${userId}/snapshottoken`, {
    //     headers: {
    //       Authorization: `Bearer ${this.auth.accessToken}`,
    //     },
    //   })
    //     .then(async (response: Response) => {
    //       if (response.ok) {
    //         const tokens = (await response.json()) as SnapShotToken[];
    //         resolve(tokens);
    //       } else {
    //         reject();
    //       }
    //     })
    //     .catch(async (e) => {
    //       reject(e);
    //     });
    // });

    return [
      {
        id: 1,
        name: 'firstSnapshotToken',
        landscapeToken: {
          alias: 'egal',
          created: 123456,
          ownerId: 'egal',
          sharedUsersIds: [],
          value: '12444195-6144-4254-a17b-asdgfewefg',
        },
        owner: 'User',
        createdAt: 1714833928,
        configuration: null,
        camera: null,
        annotation: null,
        isShared: false,
      },
      {
        id: 1,
        name: 'secondSnapshotToken',
        landscapeToken: {
          alias: 'egal',
          created: 123456,
          ownerId: 'egal',
          sharedUsersIds: [],
          value: '12444195-6144-4254-a17b-asdgfewefg',
        },
        owner: 'User',
        createdAt: 1715833928,
        configuration: null,
        camera: null,
        annotation: null,
        isShared: false,
      },
      {
        id: 1,
        name: 'firstSharedSnapshotToken',
        landscapeToken: {
          alias: 'egal',
          created: 123456,
          ownerId: 'egal',
          sharedUsersIds: [],
          value: '12444195-6144-4254-a17b-asdgfewefg',
        },
        owner: 'User',
        createdAt: 1716833928,
        configuration: null,
        camera: null,
        annotation: null,
        isShared: true,
      },
      {
        id: 1,
        name: 'secondSharedSnapshotToken',
        landscapeToken: {
          alias: 'egal',
          created: 123456,
          ownerId: 'egal',
          sharedUsersIds: [],
          value: '12444195-6144-4254-a17b-asdgfewefg',
        },
        owner: 'User',
        createdAt: 1917833928,
        configuration: null,
        camera: null,
        annotation: null,
        isShared: true,
      },
    ];
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:snapshot-token')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('snapshot-token') declare altName: SnapshotTokenService;`.
declare module '@ember/service' {
  interface Registry {
    'snapshot-token': SnapshotTokenService;
  }
}
