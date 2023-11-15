import { ForceGraph3DInstance } from '3d-force-graph';
import { inject as service } from '@ember/service';
import { task, all } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData, SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import { GraphNode } from 'explorviz-frontend/rendering/application/force-graph';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { CommunicationLink } from 'explorviz-frontend/ide/ide-websocket';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import computeClassCommunication, {
  computeRestructuredClassCommunication,
} from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { calculateLineThickness } from 'explorviz-frontend/utils/application-rendering/communication-layouter';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import { Application, Class, Package, StructureLandscapeData, preProcessAndEnhanceStructureLandscape } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import DetachedMenuRenderer from 'virtual-reality/services/detached-menu-renderer';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import LocalUser from 'collaborative-mode/services/local-user';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import CommitComparisonRepository from 'explorviz-frontend/services/repos/commit-comparison-repository';
import { getApplicationFromClass, getApplicationFromPackage, getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import { getClassById } from 'explorviz-frontend/utils/class-helpers';
import { getNodeFromApplication } from 'explorviz-frontend/utils/application-helpers';
import { getPackageById } from 'explorviz-frontend/utils/package-helpers';


interface NamedArgs {
  readonly landscapeData: LandscapeData;
  readonly graph: ForceGraph3DInstance;
  readonly selectedApplication: string | null;
  readonly selectedCommits: Map<string,SelectedCommit[]>;
}

interface Args {
  positional: [];
  named: NamedArgs;
}

const { landscapeService} = ENV.backendAddresses;
export default class LandscapeDataWatcherModifier extends Modifier<Args> {
  debug = debugLogger('ApplicationRendererModifier');

  @service('repos/application-repository')
  private applicationRepo!: ApplicationRepository;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('configuration')
  configuration!: Configuration;

  @service('virtual-reality@vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  @service('local-user')
  localUser!: LocalUser;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('auth') auth!: Auth;

  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

  @service
  private worker!: any;

  private landscapeData!: LandscapeData;

  private graph!: ForceGraph3DInstance;

  private selectedApplication! : string | null;

  private selectedCommits!: Map<string,SelectedCommit[]>;

  get structureLandscapeData() {
    return this.landscapeData.structureLandscapeData;
  }

  set structureLandscapeData(structureLandscapeData: StructureLandscapeData) {
    this.landscapeData.structureLandscapeData = structureLandscapeData;
  }

  get dynamicLandscapeData() {
    return this.landscapeData.dynamicLandscapeData;
  }

  


  async modify(
    _element: any,
    _positionalArgs: any[],
    { landscapeData, graph, selectedApplication, selectedCommits }: any
  ) {
    this.landscapeData = landscapeData;
    this.graph = graph;
    this.selectedApplication = selectedApplication;
    this.selectedCommits = selectedCommits;
    this.handleUpdatedLandscapeData.perform();
  }

  handleUpdatedLandscapeData = task({ restartable: true }, async () => {
    await Promise.resolve();

    // adapt the landscape structure if we have a comparison so the missing structure data from the second commit is considered too
    if(this.selectedApplication !== null && this.selectedCommits.get(this.selectedApplication)?.length === 2){
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!ZWEI COMMITS!!!");
      const commits = this.selectedCommits.get(this.selectedApplication);

      this.adaptStructure(commits!);
      
    }


    // const testt = `{
    //   "landscapeToken": "abc",
    //   "nodes": [
    //     {
    //       "ipAddress": "172.28.0.16",
    //       "hostName": "9641202b38a9",
    //       "applications": [
    //         {
    //           "name": "petclinic-demo",
    //           "language": "java",
    //           "instanceId": "0",
    //           "packages": [
    //             {
    //               "name": "org",
    //               "subPackages": [
    //                 {
    //                   "name": "springframework",
    //                   "subPackages": [
    //                     {
    //                       "name": "samples",
    //                       "subPackages": [
    //                         {
    //                           "name": "petclinic",
    //                           "subPackages": [
    //                             {
    //                               "name": "vet",
    //                               "subPackages": [],
    //                               "classes": [
    //                                 {
    //                                   "name": "Vet",
    //                                   "methods": [
    //                                   ]
    //                                 }
    //                               ]
    //                             }
    //                           ],
    //                           "classes": []
    //                         }
    //                       ],
    //                       "classes": []
    //                     }
    //                   ],
    //                   "classes": []
    //                 }
    //               ],
    //               "classes": []
    //             }
    //           ]
    //         }
    //       ]
    //     }
    //   ]
    // }`;
    

    //const testtt = JSON.parse(testt);

    //const testttt = preProcessAndEnhanceStructureLandscape(testtt as StructureLandscapeData);

    //this.structureLandscapeData = testttt;
   
    console.log(this.structureLandscapeData);
    this.structureLandscapeData = this.structureLandscapeData;

    let classCommunications = computeClassCommunication(
      this.structureLandscapeData,
      this.dynamicLandscapeData
    );

    if (this.landscapeRestructure.restructureMode) {
      classCommunications = computeRestructuredClassCommunication(
        classCommunications,
        this.landscapeRestructure.createdClassCommunication,
        this.landscapeRestructure.copiedClassCommunications,
        this.landscapeRestructure.updatedClassCommunications,
        this.landscapeRestructure.completelyDeletedClassCommunications
      );
    }

    this.landscapeRestructure.allClassCommunications = classCommunications;

    // Use the updated landscape data to calculate application metrics.
    // This is done for all applications to have accurate heatmap data.

    const { nodes: graphNodes } = this.graph.graphData();
    const { nodes } = this.structureLandscapeData;

    const nodeLinks: any[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      for (let j = 0; j < node.applications.length; ++j) {
        const application = node.applications[j];
        const applicationData = await this.updateApplicationData.perform(
          application,
          classCommunications
        );

        // create or update applicationObject3D
        const app =
          await this.applicationRenderer.addApplicationTask.perform(
            applicationData
          );

        // fix previously existing nodes to position (if present) and calculate collision size
        const graphNode = graphNodes.findBy(
          'id',
          applicationData.application.id
        ) as GraphNode;

        if (!app.foundationMesh) {
          console.error('No foundation mesh, this should not happen');
          return;
        }

        const { x, z } = app.foundationMesh.scale;
        const collisionRadius = Math.hypot(x, z) / 2 + 3;
        if (graphNode) {
          graphNode.collisionRadius = collisionRadius;
          graphNode.fx = graphNode.x;
          graphNode.fz = graphNode.z;
        } else {
          graphNodes.push({
            id: applicationData.application.id,
            fy: 0,
            collisionRadius,
          } as GraphNode);
        }

        // create (invisible) links between apps on the same node
        node.applications.forEach((nodeApp) => {
          if (nodeApp.id !== application.id) {
            nodeLinks.push({
              source: application.id,
              target: nodeApp.id,
              value: 1, // used for particles
            });
          }
        });
      }
    }

    // Apply restructure textures in restructure mode
    this.landscapeRestructure.applyTextureMappings();

    const interAppCommunications = classCommunications.filter(
      (x) => x.sourceApp !== x.targetApp
    );
    const communicationLinks = interAppCommunications.map((communication) => ({
      source: graphNodes.findBy('id', communication.sourceApp?.id) as GraphNode,
      target: graphNodes.findBy('id', communication.targetApp?.id) as GraphNode,
      value: calculateLineThickness(communication),
      communicationData: communication,
    }));

    const gData = {
      nodes: graphNodes,
      links: [...communicationLinks, ...nodeLinks],
    };

    const { serializedRoom } = this.roomSerializer;

    if (serializedRoom) {
      this.applicationRenderer.restoreFromSerialization(serializedRoom);

      if (this.localUser.visualizationMode === 'vr') {
        this.detachedMenuRenderer.restore(serializedRoom.detachedMenus);
      } else if (this.localUser.visualizationMode === 'browser') {
        //restore(serializedRoom.detachedMenus); // browser popups not restorable?
      }

      this.roomSerializer.serializedRoom = undefined;
    } else {
      const openApplicationsIds = this.applicationRenderer.openApplicationIds;
      for (let i = 0; i < openApplicationsIds.length; ++i) {
        const applicationId = openApplicationsIds[i];
        const applicationData = this.applicationRepo.getById(applicationId);
        if (!applicationData) {
          this.applicationRenderer.removeApplicationLocallyById(applicationId);
        }
      }
      this.highlightingService.updateHighlighting();
    }
    this.graph.graphData(gData);

    // send new data to ide
    const cls: CommunicationLink[] = [];
    communicationLinks.forEach((element) => {
      const meshIDs = element.communicationData.id.split('_');
      const tempCL: CommunicationLink = {
        meshID: element.communicationData.id,
        sourceMeshID: meshIDs[0],
        targetMeshID: meshIDs[1],
        methodName: meshIDs[2],
      };
      cls.push(tempCL);
    });
    this.ideWebsocketFacade.refreshVizData(cls);

    // apply new color for restructured communications in restructure mode
    this.landscapeRestructure.applyColorMappings();
  });
  

  updateApplicationData = task(
    async (
      application: Application,
      classCommunication: ClassCommunication[]
    ) => {
      const workerPayload = {
        structure: application,
        dynamic: this.dynamicLandscapeData,
      };
      const cityLayout = this.worker.postMessage(
        'city-layouter',
        workerPayload
      );
      const heatmapMetrics = this.worker.postMessage(
        'metrics-worker',
        workerPayload
      );

      const flatData = this.worker.postMessage(
        'flat-data-worker',
        workerPayload
      );


      /*const inheritance = this.worker.postMessage(
        'inheritance-worker',
        {structure: application}
      );*/

      const results = (await all([
        cityLayout,
        heatmapMetrics,
        flatData,
        //inheritance
      ])) as any[];

      let applicationData = this.applicationRepo.getById(application.id);
      if (applicationData) {
        applicationData.updateApplication(application, results[0], results[2]/*, results[3]*/);
      } else {
        applicationData = new ApplicationData(
          application,
          results[0],
          results[2]/*,
          results[3]*/
        );
      }
      applicationData.classCommunications = classCommunication.filter(
        (communication) => {
          return (
            communication.sourceApp.id === application.id &&
            communication.targetApp.id === application.id
          );
        }
      );
      calculateHeatmap(applicationData.heatmapData, results[1]);
      this.applicationRepo.add(applicationData);
      return applicationData;
    }
  );

  async adaptStructure(selectedCommits: SelectedCommit[]) {
    // get structure landscape of second commit
    const secondCommitId = selectedCommits[1].commitId;
    const secondCommitStructureLandscape = await this.requestStructureData(secondCommitId);
    const structure = preProcessAndEnhanceStructureLandscape(secondCommitStructureLandscape);

    // now add the components that got added in the second commit but are missing in the first commit
    const selectedCommitsList = [ selectedCommits[0].commitId,  selectedCommits[1].commitId];
    selectedCommitsList.sort();
    const id = selectedCommitsList.join("_");

    const commitComparisonRepo = this.commitComparisonRepo;
    const commitComparison = commitComparisonRepo.getById(id);

    if(!commitComparison) return;

    //const addedComponentIds  = commitComparison.added;

    const addedComponentIds = ["96e1c58c2ee0462ce0e37cc06001a55d8b6e73feb8157ae97ab88b23152b89ab"]; // test purpose. OwnerResource class id, which is missing for the first commit from master branch

    addedComponentIds.forEach(componentId => { // only classes or packages can be added in structure. Note that the id's we are iterating through are from "most comprehensive" components, meaning that all children components weren't there before in the first commit, but parent of a most comprehensive component was
      const pckg = getPackageById(structure, componentId);
      const clazz = getClassById(structure, componentId);

      if(pckg){
        const parentPackage = pckg.parent;
        if(parentPackage){
          // add to package
          console.log("TRY TO ADD PACKAGE");
          const packageId = parentPackage.id;
          const firstCommitPackage = getPackageById(this.structureLandscapeData, packageId);

          if(firstCommitPackage){
            console.log("ADD ", pckg.name, " PACKAGE TO ", firstCommitPackage.name," PACKAGE");
            if(firstCommitPackage.subPackages){
              firstCommitPackage.subPackages.push(pckg);
            }else {
              firstCommitPackage.subPackages = [pckg];
            }
          }
        }else {
          // add to application
          const secondCommitApp = getApplicationFromPackage(structure, pckg.id);
          if(secondCommitApp){
            const appId = secondCommitApp.id;
            const firstCommitApp = getApplicationInLandscapeById(this.structureLandscapeData, appId);
            
            if(firstCommitApp){
              console.log("ADD ", pckg.name, " PACKAGE TO ", firstCommitApp.name," APPLICATION");
              if(firstCommitApp.packages){
                firstCommitApp.packages.push(pckg);
              }else {
                firstCommitApp.packages = [pckg];
              }
            }
          }
        }
      }else if(clazz){
        const parentPackage = clazz.parent;
        const packageId = parentPackage.id;

        const firstCommitPackage = getPackageById(this.structureLandscapeData, packageId);
        if(firstCommitPackage){
          console.log("ADD ", clazz.name, " CLASS TO ", firstCommitPackage.name," PACKAGE");
          firstCommitPackage.classes.push(clazz);
          clazz.parent = firstCommitPackage;
        }
      }
    });

  }

  requestStructureData(commitId: string){
    return new Promise<StructureLandscapeData>((resolve, reject) => {
      if (this.tokenService.token === null) {
        reject(new Error('No landscape token selected'));
        return;
      }
      fetch(
        `${landscapeService}/v2/landscapes/${this.tokenService.token.value}/commit-structure/${commitId}`, 
        {
          headers: {
            Authorization: `Bearer ${this.auth.accessToken}`,
          },
        }
      )
        .then(async (response: Response) => {
          if (response.ok) {
            const commitStructureData =
              (await response.json()) as StructureLandscapeData;
            resolve(commitStructureData);
          } else {
            reject();
          }
        })
        .catch((e) => reject(e));
    });
  }
}
