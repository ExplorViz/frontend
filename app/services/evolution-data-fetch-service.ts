import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import LandscapeTokenService from './landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import { CommitTree } from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { SelectedCommit } from 'explorviz-frontend/utils/commit-tree/commit-tree-handler';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

const { codeService } = ENV.backendAddresses;

export default class EvolutionDataFetchServiceService extends Service {
  private readonly debug = debugLogger('EvolutionDataFetchServiceService');

  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('auth') auth!: Auth;

  // #region Fetch functions

  async fetchApplications(): Promise<string[]> {
    this.debug('Fetching applications');
    const url = this.constructUrl('applications');
    const response = await this.fetchFromService(url);
    return response as string[];
  }

  async fetchCommitTreeForAppName(appName: string): Promise<CommitTree> {
    const url = this.constructUrl('commit-tree', appName);
    const response = await this.fetchFromService(url);
    return response as CommitTree;
  }

  async fetchStaticLandscapeStructuresForAppName(
    applicationName: string,
    commits: SelectedCommit[]
  ): Promise<StructureLandscapeData> {
    this.debug('Fetching static landscape structure(s)');

    const firstSelectedCommitId = commits[0].commitId;
    let url: string;

    if (commits.length === 1) {
      url = this.constructUrl(
        'structure',
        applicationName,
        firstSelectedCommitId
      );
    } else if (commits.length === 2) {
      const secondSelectedCommitId = commits[1].commitId;
      url = this.constructUrl(
        'structure',
        applicationName,
        `${firstSelectedCommitId}-${secondSelectedCommitId}`
      );
    } else {
      throw new Error('Invalid number of commits');
    }

    const response = await this.fetchFromService(url);
    return response as StructureLandscapeData;
  }

  // #endregion

  // #region Private helper functions

  private getLandscapeToken(): string {
    const landscapeToken = this.tokenService.token?.value;
    if (!landscapeToken) {
      throw new Error('No landscape token selected');
    }
    return landscapeToken;
  }

  private constructUrl(endpoint: string, ...params: string[]): string {
    const landscapeToken = this.getLandscapeToken();
    return `${codeService}/v2/code/${endpoint}/${landscapeToken}/${params.join('/')}`;
  }

  private async fetchFromService(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Access-Control-Allow-Origin': '*',
      },
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorText = await response.text();
      throw new Error(
        `Fetch failed with status ${response.status}: ${errorText}`
      );
    }
  }

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'evolution-data-fetch-service': EvolutionDataFetchServiceService;
  }
}
