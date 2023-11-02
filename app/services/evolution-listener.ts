import Service, { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import TimestampRepository from './repos/timestamp-repository';
import LandscapeTokenService from './landscape-token';
import debugLogger from 'ember-debug-logger';
import Auth from './auth';
import { EvolutionLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import ENV from 'explorviz-frontend/config/environment';


const { landscapeService } = ENV.backendAddresses;

export default class EvolutionListener extends Service.extend(Evented) {
    
    @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;

    @service('auth') auth!: Auth;

    @service('landscape-token') tokenService!: LandscapeTokenService;

    latestEvolutionData: EvolutionLandscapeData | null = null;

    timer: NodeJS.Timeout | null = null;

    debug = debugLogger();

    async initEvolutionPolling(intervalInSeconds: number = 10) {
        function setIntervalImmediately(func: () => void, interval: number) {
          func();
          return setInterval(func, interval);
        }
    
        this.timer = setIntervalImmediately(async () => {
          this.pollData();
        }, intervalInSeconds * 1000);
    
        this.debug('Timer started timer (for evolution)');
      }


      async pollData() {
        try {
          // request current repository state (i.e. existing branches and commits)
          // TODO: instead of receiving full blown json better receive only list of commit ids for each branch and compare for new data. Then request more information for this new data
          const [evolutionDataProm] = await this.requestData();
    
          let triggerUpdate = false;
    
          let evolutionData = null;
          if (evolutionDataProm.status === 'fulfilled') {
            evolutionData = evolutionDataProm.value;
    
            if (
              !this.latestEvolutionData ||
              JSON.stringify(this.latestEvolutionData) !==
                JSON.stringify(evolutionData)
            ) {

              // TODO: request more information and enhance evolution data
    
            //   this.latestStructureData =
            //     preProcessAndEnhanceStructureLandscape(structureData);
    
              this.latestEvolutionData = evolutionData;

              console.log("change in evolution data detected");
    
              triggerUpdate = true;
            }
          }
            
          //this.updateEvolutionRepoAndCommitline();
    
          if (triggerUpdate) { // TODO: new commit in commitline or new branch in list of branches
            this.debug('Trigger Data Update');
            this.trigger(
              'newEvolutionData',
              this.latestEvolutionData
            );
    
            if (
              ENV.mode.tokenToShow &&
              ENV.mode.tokenToShow !== 'change-token' &&
              this.timer
            ) {
              clearTimeout(this.timer);
            }
          }
        } catch (e) {
          // landscape data could not be requested, try again?
        }
      }

      async requestData() {
        
        const evolutionDataPromise =
          this.requestEvolutionData();
    
        const evolutionData = Promise.allSettled([
            evolutionDataPromise
        ]);
    
        return evolutionData;
      }

      requestEvolutionData() {
        return new Promise<EvolutionLandscapeData>((resolve, reject) => {
          if (this.tokenService.token === null) {
            reject(new Error('No landscape token selected'));
            return;
          }
          fetch(
            `${landscapeService}/v2/landscapes/${this.tokenService.token.value}/branches`,
            {
              headers: {
                Authorization: `Bearer ${this.auth.accessToken}`,
              },
            }
          )
            .then(async (response: Response) => {
              if (response.ok) {
                const evolutionData =
                  (await response.json()) as EvolutionLandscapeData;
                console.log("request evolution data");
                resolve(evolutionData);
              } else {
                reject();
                console.log("reject");
              }
            })
            .catch((e) => { console.log("err reject"); reject(e)});
        });
      }
    

}


declare module '@ember/service' {
    interface Registry {
      'evolution-listener': EvolutionListener;
    }
  }