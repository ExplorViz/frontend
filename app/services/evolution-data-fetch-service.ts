import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import LandscapeTokenService from './landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import {
  Commit,
  CommitComparison,
  CommitTree,
} from 'explorviz-frontend/utils/evolution-schemes/evolution-data';

import {
  preProcessAndEnhanceStructureLandscape,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { ApplicationMetricsCode } from 'explorviz-frontend/utils/metric-schemes/metric-data';
import { SelectedCommit } from './commit-tree-state';

const { codeService } = ENV.backendAddresses;

export default class EvolutionDataFetchServiceService extends Service {
  private readonly debug = debugLogger('EvolutionDataFetchServiceService');

  // #region Services

  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('auth') auth!: Auth;

  // #endregion

  // #region Fetch functions

  async fetchApplications(): Promise<string[]> {
    const url = this.constructUrl('applications');
    return await this.fetchFromService<string[]>(url);
  }

  async fetchCommitTreeForAppName(appName: string): Promise<CommitTree> {
    const url = this.constructUrl('commit-tree', appName);
    return await this.fetchFromService<CommitTree>(url);
  }

  async fetchApplicationMetricsCodeForAppNameAndCommit(
    applicationName: string,
    commit: Commit
  ): Promise<ApplicationMetricsCode> {
    const url = this.constructUrl('metrics', applicationName, commit.commitId);
    return await this.fetchFromService<ApplicationMetricsCode>(url);
  }

  async fetchApplicationMetricsCodeForAppAndCommits(
    applicationName: string,
    commits: SelectedCommit[]
  ): Promise<Map<string, ApplicationMetricsCode>> {
    const commitIdToAppMetricsCodeMap: Map<string, ApplicationMetricsCode> =
      new Map();

    for (const commit of commits) {
      const url = this.constructUrl(
        'metrics',
        applicationName,
        commit.commitId
      );
      const appMetricsCode =
        await this.fetchFromService<ApplicationMetricsCode>(url);

      commitIdToAppMetricsCodeMap.set(commit.commitId, appMetricsCode);
    }

    return commitIdToAppMetricsCodeMap;
  }

  async fetchCommitComparison(
    applicationName: string,
    baseCommit: Commit,
    comparisonCommit: Commit
  ): Promise<CommitComparison> {
    const url = this.constructUrl(
      'commit-comparison',
      applicationName,
      `${baseCommit.commitId}-${comparisonCommit.commitId}`
    );

    const response = await this.fetchFromService(url);
    return response as CommitComparison;
  }

  async fetchStaticLandscapeStructuresForAppName(
    applicationName: string,
    commits: SelectedCommit[]
  ): Promise<StructureLandscapeData> {
    if (commits.length < 1 || commits.length > 2) {
      throw new Error('Invalid number of commits');
    }

    const [firstCommit, secondCommit] = commits;
    const commitPath = secondCommit
      ? `${firstCommit.commitId}-${secondCommit.commitId}`
      : firstCommit.commitId;
    const url = this.constructUrl('structure', applicationName, commitPath);

    const response = await this.fetchFromService<StructureLandscapeData>(url);
    return preProcessAndEnhanceStructureLandscape(
      response,
      TypeOfAnalysis.Static
    );
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

  private async fetchFromService<T>(url: string): Promise<T> {
    this.debug(`Fetching from service with URL: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new FetchError(response.status, errorText);
      }

      return (await response.json()) as T;
    } catch (error) {
      this.debug(`Fetch error: ${error}`);
      throw error;
    }
  }

  // #endregion
}

class FetchError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(`Fetch failed with status ${status}: ${message}`);
    this.name = 'FetchError';
  }
}

declare module '@ember/service' {
  interface Registry {
    'evolution-data-fetch-service': EvolutionDataFetchServiceService;
  }
}
