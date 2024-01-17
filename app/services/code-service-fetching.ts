import Service, { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import LandscapeTokenService from './landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from './auth';
import { EvolutedApplication } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import CommitComparisonRepository, { CommitComparison } from './repos/commit-comparison-repository';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';

const { codeService } = ENV.backendAddresses;

export default class CodeServiceFetchingService extends Service {
  @service('landscape-token') tokenService!: LandscapeTokenService;
  @service('auth') auth!: Auth;
  
  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

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

  // async initCommitComparisonFetchingWithCallback(
  //   callback: (commitComparison: CommitComparison) => void,
  //   applicationName: string,
  //   commits: SelectedCommit[]
  // ) {
  //   const commitComparisonPromise = this.fetchCommitComparison(applicationName, commits);
  //   commitComparisonPromise
  //     .then((commitComparison: CommitComparison) => {
  //       commitComparison.firstCommitSelected = commits[0];
  //       commitComparison.secondCommitSelected = commits[1];
  //       callback(commitComparison);
  //     })
  //     .catch((error: Error) => {
  //       console.log(error);
  //     });
  // }

  // private fetchCommitComparison(applicationName: string, commits: SelectedCommit[]) {
  //   this.debug('Fetching commit comparison');
  //   return new Promise<CommitComparison>((resolve, reject) => {
  //     if (this.tokenService.token === null) {
  //       reject(new Error('No landscape token selected'));
  //       return;
  //     }

  //     const firstSelectedCommitId = commits[0].commitId;
  //     const secondSelectedCommitId = commits[1].commitId;

  //     let url = `${codeService}/commit-comparison/${this.tokenService.token.value}/${applicationName}/${firstSelectedCommitId}-${secondSelectedCommitId}`; 

  //     fetch(url, {
  //       headers: {
  //         Authorization: `Bearer ${this.auth.accessToken}`,
  //         'Access-Control-Allow-Origin': '*',
  //       },
  //     })
  //       .then(async (response: Response) => {
  //         if (response.ok) {
  //           const commitComparison = (await response.json()) as CommitComparison;
  //           resolve(commitComparison);
  //         } else {
  //           reject();
  //         }
  //       })
  //       .catch((e) => reject(e));
  //   });

  // }

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

  async initStaticLandscapeStructureFetchingWithCallback(
    callback: (landscapeStructure: StructureLandscapeData) => void,
    applicationName: string,
    commits: SelectedCommit[]
  ) {
    const landscapeStructure = this.fetchStaticLandscapeStructure(applicationName, commits);
    landscapeStructure
      .then((landscapeStructure: StructureLandscapeData) => callback(landscapeStructure))
      .catch((error: Error) => {
        console.log(error);
      });
  }

  private fetchStaticLandscapeStructure(applicationName: string, commits: SelectedCommit[]) {
    this.debug('Fetching static landscape structure');
    return new Promise<StructureLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }

      let url : string | undefined = undefined;
      if(commits.length === 1) {
        url = `${codeService}/structure//${this.tokenService.token.value}/${applicationName}/${commits[0].commitId}`; 
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


        const firstSelectedCommitId = commits[0].commitId;
        const secondSelectedCommitId = commits[1].commitId;
        url = `${codeService}/commit-comparison/${this.tokenService.token.value}/${applicationName}/${firstSelectedCommitId}-${secondSelectedCommitId}`; 
        
        if (!this.commitComparisonRepo.getById(`${firstSelectedCommitId}_${secondSelectedCommitId}`)) {
          const commitComparisonPromise = new Promise<CommitComparison>((resolve, reject) => {
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
  
          commitComparisonPromise.then(
            (commitComparison : CommitComparison) => {
              commitComparison.firstCommitSelected = commits[0];
              commitComparison.secondCommitSelected = commits[1];
              this.commitComparisonRepo.add(commitComparison);

              url = `${codeService}/structure/${this.tokenService.token!.value}/${applicationName}/${commits[0].commitId}-${commits[1].commitId}`; 
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

            }
          ).catch((error: Error) => {
            console.log(error);
          });
        }else {
          url = `${codeService}/structure/${this.tokenService.token.value}/${applicationName}/${commits[0].commitId}-${commits[1].commitId}`;
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
        }

        //url = `${codeService}/structure/${this.tokenService.token.value}/${applicationName}/${commits[0].commitId}-${commits[1].commitId}`; 
      }
      
      // if (!url) {
      //   console.debug("No url to fetch data from");
      //   return;
      // }
      // fetch(url, {
      //   headers: {
      //     Authorization: `Bearer ${this.auth.accessToken}`,
      //     'Access-Control-Allow-Origin': '*',
      //   },
      // })
      //   .then(async (response: Response) => {
      //     if (response.ok) {
      //       const landscapeStructure = (await response.json()) as StructureLandscapeData;
      //       resolve(landscapeStructure);
      //     } else {
      //       reject();
      //     }
      //   })
      //   .catch((e) => reject(e));
    });
  }


}

declare module '@ember/service' {
  interface Registry {
    'code-service-fetching': CodeServiceFetchingService;
  }
}
