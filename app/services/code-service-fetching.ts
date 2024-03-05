import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import LandscapeTokenService from './landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import { EvolutedApplication } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import CommitComparisonRepository, { CommitComparison } from './repos/commit-comparison-repository';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import StaticMetricsRepository, { Metrics } from './repos/static-metrics-repository';
import CommitReportRepository, { CommitReport, isCommitReport } from './repos/commit-report-repository';

const { codeService } = ENV.backendAddresses;

export default class CodeServiceRequestService extends Service {
  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('auth') auth!: Auth;
  
  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

  @service('repos/static-metrics-repository')
  staticMetricsRepo!: StaticMetricsRepository;

  @service('repos/commit-report-repository')
  commitReportRepo!: CommitReportRepository;

  private debug = debugLogger();

  async initApplicationFetchingWithCallback(
    callback: (applications: string[]) => void
  ) {
    this.fetchApplications(callback);
  }

  private fetchApplications(callback: (applications: string[]) => void) {

    const landscapeToken = this.tokenService.token?.value;

    if (!landscapeToken) {
      console.log('No landscape token.');
      return;
    }

    const applicationPromise = this.httpFetchApplications();

    applicationPromise
      .then((applications: string[]) => callback(applications))
      .catch((error: Error) => {
        console.log(error);
      });
  }

  private httpFetchApplications() {
    this.debug('Fetching applications');
    return new Promise<string[]>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      let url = `${codeService}/v2/applications/${this.tokenService.token.value}`;

      fetch(url, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const applications = (await response.json()) as string[];
            resolve(applications);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  private httpFetchStaticMetrics(applicationName: string, commitId: string) {
   
    return new Promise<Metrics>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      let url = `${codeService}/metrics/${this.tokenService.token.value}/${applicationName}/${commitId}`; 

      fetch(url, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const metrics = (await response.json()) as Metrics;
            resolve(metrics);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  async initCommitTreeFetchingWithCallback(
    callback: (applications: EvolutedApplication) => void,
    applicationName: string
  ) {
    this.fetchCommitTree(callback, applicationName);
  }

  private fetchCommitTree(callback: (commitTree: EvolutedApplication) => void, applicationName: string) {

    const landscapeToken = this.tokenService.token?.value;

    if (!landscapeToken) {
      console.log('No landscape token.');
      return;
    }

    const applicationPromise = this.httpFetchCommitTree(applicationName);

    applicationPromise
      .then((commitTree: EvolutedApplication) => callback(commitTree))
      .catch((error: Error) => {
        console.log(error);
      });
  }

  private httpFetchCommitTree(applicationName: string) {
    this.debug('Fetching applications');
    return new Promise<EvolutedApplication>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      let url = `${codeService}/commit-tree/${this.tokenService.token.value}/${applicationName}`; 

      fetch(url, {
        headers: {
          Authorization: `Bearer ${this.auth.accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      })
        .then(async (response: Response) => {
          if (response.ok) {
            const commitTree = (await response.json()) as EvolutedApplication;
            resolve(commitTree);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  async initStaticLandscapeStructureAndMetricsFetchingWithCallback(
    callback: (landscapeStructure: StructureLandscapeData) => void,
    applicationName: string,
    commits: SelectedCommit[]
  ) {
    await this.fetchStaticMetrics(applicationName, commits.lastObject!);
    const landscapeStructure = this.fetchStaticLandscapeStructure(applicationName, commits);

    if(commits.length == 2) {
      // also request commit comparison
      await this.fetchCommitComparison(applicationName, commits);
    }
   
    landscapeStructure
      .then((landscapeStructure: StructureLandscapeData) => callback(landscapeStructure))
      .catch((error: Error) => {
        console.log(error);
      });
  }


  private fetchStaticLandscapeStructure(applicationName: string, commits: SelectedCommit[]) {
    const staticLandscapeStructurePromise = this.httpFetchStaticLandscapeStructure(applicationName, commits);
    return staticLandscapeStructurePromise;
  }
      

  private httpFetchStaticLandscapeStructure(applicationName: string, commits: SelectedCommit[]) {
    this.debug('Fetching static landscape structure');
    return new Promise<StructureLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      let url : string | undefined = undefined;
      const firstSelectedCommitId = commits[0].commitId;
      if(commits.length === 1) {
        url = `${codeService}/structure/${this.tokenService.token.value}/${applicationName}/${firstSelectedCommitId}`; 
        fetch(url, {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        })
          .then(async (response: Response) => {
            if (response.ok) {
              const landscapeStructure = (await response.json()) as StructureLandscapeData;
              resolve(landscapeStructure);
            } else {
              reject();
            }
          })
          .catch((e) => reject(e));
      } else if(commits.length === 2) {
        const secondSelectedCommitId = commits[1].commitId;
        // Note that we already receive the combined structure from the backend!
        url = `${codeService}/structure/${this.tokenService.token.value}/${applicationName}/${firstSelectedCommitId}-${secondSelectedCommitId}`;
        fetch(url, {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        })
          .then(async (response: Response) => {
            if (response.ok) {
              const landscapeStructure = (await response.json()) as StructureLandscapeData;
              resolve(landscapeStructure);
            } else {
              reject();
            }
          })
          .catch((e) => reject(e));
      }});
  }

  private async fetchCommitComparison(applicationName: string, commits: SelectedCommit[]) {
    const firstSelectedCommitId = commits[0].commitId;
    const secondSelectedCommitId = commits[1].commitId;
    if (!this.commitComparisonRepo.getById(`${firstSelectedCommitId}_${secondSelectedCommitId}`)) {
      const commitComparison = await this.httpFetchCommitComparison(applicationName, commits);
      commitComparison.firstCommitSelected = commits[0];
      commitComparison.secondCommitSelected = commits[1];
      this.commitComparisonRepo.add(commitComparison);
    }
  }

  private httpFetchCommitComparison(applicationName: string, commits: SelectedCommit[]) {
    this.debug('Fetching commit comparison');
    return new Promise<CommitComparison>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

    const firstSelectedCommitId = commits[0].commitId;
    const secondSelectedCommitId = commits[1].commitId;
    const url = `${codeService}/commit-comparison/${this.tokenService.token.value}/${applicationName}/${firstSelectedCommitId}-${secondSelectedCommitId}`;

    fetch(url!, {
      headers: {
        Authorization: `Bearer ${this.auth.accessToken}`,
        'Access-Control-Allow-Origin': '*',
      },
    })
      .then(async (response: Response) => {
        if (response.ok) {
          const commitComparison = (await response.json()) as CommitComparison;
          resolve(commitComparison);
        } else {
          reject();
        }
      })
      .catch((e) => reject(e));
  });
  }

  private httpFetchCommitReport(commitId: string, selectedApplication: string) {
    return new Promise<CommitReport>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${codeService}/commit-report/${this.tokenService.token.value}/${selectedApplication}/${commitId}`,
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const commitReport =
              (await response.json()) as CommitReport;
              if(isCommitReport(commitReport))
                resolve(commitReport);
              else
                reject("NO COMMIT REPORT TYPE");
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }

  async fetchCommitReport(commitId: string, selectedApplication: string) {
    const id = selectedApplication + commitId;
    if(!this.commitReportRepo.getById(id)) {
      const commitReport =  await this.httpFetchCommitReport(commitId, selectedApplication);
      this.commitReportRepo.add(id, commitReport);
    }
  }


  private async fetchStaticMetrics(applicationName: string, commit: SelectedCommit) {
      const commitId = commit.commitId;
      const metrics = await this.httpFetchStaticMetrics(applicationName, commitId);
      const id = applicationName + commitId;
      try {
        this.staticMetricsRepo.add(id, metrics)
      } catch (error) {
        console.log(error);
      } 
  }

}

declare module '@ember/service' {
  interface Registry {
    'code-service-fetching': CodeServiceRequestService;
  }
}
