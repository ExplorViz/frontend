import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { tracked } from '@glimmer/tracking';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import {
  Application,
  Node,
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

  //@tracked
  //landscapeData: LandscapeData | null = null;

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
      this.landscapeRestructure.setLandscapeData(this.args.landscapeData);

      this.args.resetLandscapeListenerPolling();
      if (!this.args.visualizationPaused) {
        this.args.toggleVisualizationUpdating();
      }

      AlertifyHandler.showAlertifyMessage('Restructure Mode enabled');
    } else {
      if (this.args.visualizationPaused) {
        this.args.toggleVisualizationUpdating();
      }
      AlertifyHandler.showAlertifyMessage('Restructure Mode disabled');
    }
  }

  @action
  createFoundation() {
    
    // Erstellen Sie eine vorläufige Struktur für den Node.
    let myNode: Partial<Node> = {
      id: 'node1',
      ipAddress: '192.168.1.1',
      hostName: 'my-node',
    };

    const myApplication: Application = {
      id: 'app1',
      name: 'My Application',
      language: 'JavaScript',
      instanceId: 'instance1',
      parent: myNode as Node, // Hier setzen wir den vorläufigen Node als Elternknoten.
      packages: [], // Keine Packages für diese Anwendung.
    };

    // Jetzt können wir die Anwendung und die vollständigen Details zum Node hinzufügen.
    myNode = {
      ...myNode,
      applications: [myApplication], // Fügen Sie die Anwendung zum Node hinzu.
    };

    this.landscapeRestructure.landscapeData?.structureLandscapeData.nodes.push(myNode as Node);
    this.landscapeRestructure.addFoundation();
    AlertifyHandler.showAlertifyMessage("Foundation created");
  }
}
