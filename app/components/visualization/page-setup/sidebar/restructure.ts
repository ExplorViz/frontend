import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { tracked } from '@glimmer/tracking';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import {
  Application,
  Class,
  Method,
  Node,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import sha256 from 'crypto-js/sha256';

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
    
    /*let myNode: Partial<Node> = {
      id: 'node1',
      ipAddress: '192.168.1.1',
      hostName: 'my-node',
    };

    const myApplication: Application = {
      id: 'app1',
      name: 'My Application',
      language: 'JavaScript',
      instanceId: 'instance1',
      parent: myNode as Node,
      packages: [],
    };

    const myMethod: Method = {
      name: 'myMethod',
      hashCode: sha256('myMethod').toString(),
    };

    const myPackage: Package = {
      id: 'pkg123',
      name: 'My Package2',
      subPackages: [],
      classes: [],
    };

    const myClass: Class = {
      id: 'class1',
      name: 'My Class',
      methods: [myMethod],
      parent: myPackage,
    };

    const myMethod2: Method = {
      name: 'myMethod2',
      hashCode: sha256('myMethod2').toString(),
    };

    const myPackage2: Package = {
      id: 'pkg12',
      name: 'My Package2',
      subPackages: [],
      classes: [],
    };

    const myClass2: Class = {
      id: 'class12',
      name: 'My Class2',
      methods: [myMethod2],
      parent: myPackage2,
    };

    myPackage.classes.push(myClass);
    myPackage2.classes.push(myClass2);

    myApplication.packages.push(myPackage);
    myApplication.packages.push(myPackage2);

    myNode = {
      ...myNode,
      applications: [myApplication],
    };

    this.landscapeRestructure.landscapeData?.structureLandscapeData.nodes.push(myNode as Node);
    this.landscapeRestructure.addFoundation();*/
    AlertifyHandler.showAlertifyMessage("Foundation created");
  }

  @action createApp() {
    /*let myNode: Partial<Node> = {
      id: 'node2',
      ipAddress: '192.168.1.12',
      hostName: 'my-node2',
    };

    const myApplication: Application = {
      id: 'app1222',
      name: 'My Application222',
      language: 'JavaScript2222',
      instanceId: 'instance12222',
      parent: myNode as Node,
      packages: [],
    };

    const myMethod: Method = {
      name: 'myMethod2222',
      hashCode: sha256('myMethod2222').toString(),
    };

    const myPackage: Package = {
      id: 'pkg1232222',
      name: 'My Package222222',
      subPackages: [],
      classes: [],
    };

    const myClass: Class = {
      id: 'class1222',
      name: 'My Class2222',
      methods: [myMethod],
      parent: myPackage,
    };

    const myMethod2: Method = {
      name: 'myMethod23',
      hashCode: sha256('myMethod23').toString(),
    };

    const myPackage2: Package = {
      id: 'pkg123',
      name: 'My Package23',
      subPackages: [],
      classes: [],
    };

    const myClass2: Class = {
      id: 'class123',
      name: 'My Class23',
      methods: [myMethod2],
      parent: myPackage2,
    };

    myPackage.classes.push(myClass);
    myPackage2.classes.push(myClass2);

    myApplication.packages.push(myPackage);
    myApplication.packages.push(myPackage2);

    myNode = {
      ...myNode,
      applications: [myApplication],
    };

    this.landscapeRestructure.landscapeData?.structureLandscapeData.nodes.push(myNode as Node);
    this.landscapeRestructure.addFoundation();*/
    AlertifyHandler.showAlertifyMessage("Foundation created");
  }

  @action
  createApp2() {
    this.landscapeRestructure.addApp();
  }
}
