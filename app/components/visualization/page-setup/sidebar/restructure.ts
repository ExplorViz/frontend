import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { tracked } from '@glimmer/tracking';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import {
  Application,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';


interface VisualizationPageSetupSidebarRestructureArgs {
    landscapeData: LandscapeData;
    restructureLandscape: (
      structureData: StructureLandscapeData,
      dynamicData: DynamicLandscapeData
    ) => void;
    visualizationPaused: boolean;
    toggleVisualizationUpdating: () => void;
    resetLandscapeListenerPolling: () => void;
    removeComponent(componentPath: string): void;
}

export default class VisualizationPageSetupSidebarRestructure extends Component<VisualizationPageSetupSidebarRestructureArgs> {

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @tracked
  landscapeData: LandscapeData | null = null;

  @tracked
  restructureMode: boolean = false;

  @action
  close() {
    this.args.removeComponent('restructure-landscape');
  }

  @action
  toggleRestructureMode() {
    this.restructureMode = this.landscapeRestructure.toggleRestructureMode();
    if (this.restructureMode) {
        console.log(this.args.landscapeData);
        this.landscapeData = this.args.landscapeData;
        const applications: Application = {
          id: '123',
          name: 'My Empty Application',
          language: 'JavaScript',
          instanceId: 'Node.js',
          parent:
            this.landscapeData.structureLandscapeData.nodes[0].applications[0]
              .parent,
          packages: [],
        };
        this.landscapeData.structureLandscapeData.nodes[0].applications[0] =
          applications;
        const land = this.landscapeData;
  
        this.args.resetLandscapeListenerPolling();
        if (!this.args.visualizationPaused) {
          this.args.toggleVisualizationUpdating();
        }
        this.args.restructureLandscape(
          land.structureLandscapeData,
          land.dynamicLandscapeData
        );
        AlertifyHandler.showAlertifyMessage('Restructure Mode enabled');
      } else {
        if (this.args.visualizationPaused) {
          this.args.toggleVisualizationUpdating();
        }
        AlertifyHandler.showAlertifyMessage('Restructure Mode disabled');
      }
    }
  }