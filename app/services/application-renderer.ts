// #region imports
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import LocalUser from 'collaboration/services/local-user';
import { task } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import CommunicationRendering from 'explorviz-frontend/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import {
  HightlightComponentArgs,
  removeAllHighlightingFor,
} from 'explorviz-frontend/utils/application-rendering/highlighting';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import {
  Application,
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getApplicationInLandscapeById } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import ThreeForceGraph from 'three-forcegraph';
import ArSettings from 'extended-reality/services/ar-settings';
import VrApplicationObject3D from 'extended-reality/utils/view-objects/application/vr-application-object-3d';
import Configuration from './configuration';
import LinkRenderer from './link-renderer';
import ApplicationRepository from './repos/application-repository';
import FontRepository from './repos/font-repository';
import UserSettings from './user-settings';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import { getSubPackagesOfPackage } from 'explorviz-frontend/utils/package-helpers';
import HighlightingService from './highlighting-service';
import { RenderMode, SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import Evented from '@ember/object/evented';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import { applicationHasClass, getAllClassesInApplication, getAllPackagesInApplication } from 'explorviz-frontend/utils/application-helpers';
import CommitComparisonRepository, { CommitComparison } from './repos/commit-comparison-repository';
import { getClassAncestorPackages } from 'explorviz-frontend/utils/class-helpers';
import { getClassInApplicationById } from 'explorviz-frontend/utils/restructure-helper';
import { MeshLineMaterial } from 'meshline';
import MethodCall from 'explorviz-frontend/utils/landscape-schemes/dynamic/method-call';
import MessageSender from 'collaboration/services/message-sender';
import RoomSerializer from 'collaboration/services/room-serializer';
import { SerializedRoom } from 'collaboration/utils/web-socket-messages/types/serialized-room';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
// #endregion imports

export default class ApplicationRenderer extends Service.extend(Evented) {
  // #region fields

  debug = debugLogger('ApplicationRendering');

  @service('local-user')
  localUser!: LocalUser;

  @service('configuration')
  configuration!: Configuration;

  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('user-settings')
  private userSettings!: UserSettings;

  @service('message-sender')
  private sender!: MessageSender;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('repos/font-repository')
  fontRepo!: FontRepository;

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

  forceGraph!: ThreeForceGraph;

  private structureLandscapeData!: StructureLandscapeData;

  private openApplicationsMap: Map<string, ApplicationObject3D>;

  selectedCommits?: Map<string, SelectedCommit[]>;
  selectedApplication?: string;

  readonly appCommRendering: CommunicationRendering;

  // #endregion fields

  constructor(properties?: object) {
    super(properties);
    this.openApplicationsMap = new Map();
    this.appCommRendering = new CommunicationRendering(
      this.configuration,
      this.userSettings,
      this.localUser
    );
  }

  // #region getters

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  get font() {
    return this.fontRepo.font;
  }

  get openApplications() {
    return Array.from(this.openApplicationsMap.values());
  }

  get openApplicationIds() {
    return Array.from(this.openApplicationsMap.keys());
  }

  getApplicationById(id: string): ApplicationObject3D | undefined {
    return this.openApplicationsMap.get(id);
  }

  getApplicationInCurrentLandscapeById(id: string): Application | undefined {
    return getApplicationInLandscapeById(this.structureLandscapeData, id);
  }

  getBoxMeshByModelId(id: string) {
    for (const application of this.getOpenApplications()) {
      const mesh = application.getBoxMeshbyModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }

  getCommunicationMeshById(id: string) {
    for (const application of this.getOpenApplications()) {
      const mesh = application.getCommMeshByModelId(id);
      if (mesh) return mesh;
    }
    return null;
  }

  getClassCommunications(applicationObjetc3D: ApplicationObject3D) {
    const applicationData = this.applicationRepo.getById(
      applicationObjetc3D.getModelId()
    );
    return applicationData?.classCommunications || [];
  }

  getGraphPosition(mesh: THREE.Object3D) {
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    this.forceGraph.worldToLocal(worldPosition);
    return worldPosition;
  }

  getMeshById(meshId: string): BaseMesh | undefined {
    return (
      this.getBoxMeshByModelId(meshId) ||
      this.getCommunicationMeshById(meshId) ||
      this.linkRenderer.getLinkById(meshId)
    );
  }

  /**
   * Returns application id of the application which contains the mesh with the given id, if existend. Else undefined.
   *
   * @param id The mesh's id to lookup
   */
  getApplicationIdByMeshId(meshId: string) {
    for (const application of this.getOpenApplications()) {
      const mesh = application.getMeshById(meshId);
      if (mesh) return application.getModelId();
    }
    return undefined;
  }

  getOpenApplications(): ApplicationObject3D[] {
    return Array.from(this.openApplicationsMap.values());
  }

  isApplicationOpen(id: string): boolean {
    return this.openApplicationsMap.has(id);
  }

  // #endregion getters

  addApplicationTask = task(
    async (
      applicationData: ApplicationData,
      addApplicationArgs: AddApplicationArgs = {},
      selectedApplication?: string,
      selectedCommits?: Map<string, SelectedCommit[]>,
      staticStructure?: StructureLandscapeData,
      dynamicStructure?: StructureLandscapeData,
      renderMode?: RenderMode 
    ) => {

      this.selectedCommits = selectedCommits;
      this.selectedApplication = selectedApplication;

      const applicationModel = applicationData.application;
      const boxLayoutMap = ApplicationRenderer.convertToBoxLayoutMap(
        applicationData.layoutData
      );

      const isOpen = this.isApplicationOpen(applicationModel.id);
      let applicationObject3D = this.getApplicationById(applicationModel.id);


      let layoutChanged = true;
      if (applicationObject3D) { 
        // Maps cannot be compared directly. Thus, we compare their size.
        layoutChanged =
          boxLayoutMap.size !== applicationObject3D.boxLayoutMap.size;

        applicationObject3D.boxLayoutMap = boxLayoutMap;
      } else {
        applicationObject3D = new VrApplicationObject3D(
          applicationData,
          boxLayoutMap
        );
        this.openApplicationsMap.set(applicationModel.id, applicationObject3D);
      }

      const applicationState =
        Object.keys(addApplicationArgs).length === 0 && isOpen && layoutChanged
          ? this.roomSerializer.serializeToAddApplicationArgs(
              applicationObject3D
            )
          : addApplicationArgs;

      if (layoutChanged) { 
        applicationObject3D.removeAllEntities();

        // Add new meshes to application
        EntityRendering.addFoundationAndChildrenToApplication(
          applicationObject3D,
          this.userSettings.applicationColors
        );

        // Restore state of open packages and transparent components (packages and clazzes)
        EntityManipulation.restoreComponentState(
          applicationObject3D,
          applicationState.openComponents,
          applicationState.transparentComponents,
          this.highlightingService.opacity
        );

        // Add labels to application
        Labeler.addApplicationLabels(
          applicationObject3D,
          this.font,
          this.userSettings.applicationColors
        );
      }

      this.addCommunication(applicationObject3D);

      // reset transparency of inner communication links
      applicationObject3D.getCommMeshes().forEach((commMesh) => {
        if (applicationState.transparentComponents?.has(commMesh.getModelId()))
          commMesh.turnTransparent(this.highlightingService.opacity);
      });

      // reset transparency of extern communication links

      applicationState.transparentComponents?.forEach((id) => {
        const externLinkMesh = this.linkRenderer.getLinkById(id);
        if (externLinkMesh) {
          externLinkMesh.turnTransparent(this.highlightingService.opacity);
        }
      });

      // reset highlights -------------------

      const currentSetting =
        this.userSettings.applicationSettings.enableMultipleHighlighting.value;
      this.userSettings.applicationSettings.enableMultipleHighlighting.value =
        true; // so resetting multiple highlights within one application won't reset them
      applicationState.highlightedComponents?.forEach(
        (highlightedComponent) => {
          this.highlightingService.toggleHighlightById(
            highlightedComponent.entityId,
            highlightedComponent.color
          );
        }
      );
      this.userSettings.applicationSettings.enableMultipleHighlighting.value =
        currentSetting;
      // ----------------------------------------

      // this.heatmapConf.updateActiveApplication(applicationObject3D);

      // commit comparison visualization
      const commitComparison = this.getCommitComparison(applicationObject3D);

      if(commitComparison){
        this.visualizeCommitComparisonPackagesAndClasses(applicationObject3D, commitComparison);
      }else if(selectedApplication && selectedCommits?.get(selectedApplication)?.length == 1){
        // remove existing comparison visualizations
        this.removeCommitComparisonVisualization(applicationObject3D);
      }

      applicationObject3D.resetRotation();

      switch(renderMode){
        case RenderMode.DYNAMIC_ONLY:
          this.hideVisualization(applicationObject3D, staticStructure);
          this.showVisualization(applicationObject3D, dynamicStructure);
          break;
        case RenderMode.STATIC_ONLY:
          this.hideVisualization(applicationObject3D, dynamicStructure);
          this.showVisualization(applicationObject3D, staticStructure);
          break;
        case RenderMode.STATIC_DYNAMIC:
          this.showVisualization(applicationObject3D, dynamicStructure);
          this.showVisualization(applicationObject3D, staticStructure);
          break;
      }

      return applicationObject3D;
    }
  );

  private visualizeAddedPackagesAndClasses(commitComparison: CommitComparison, applicationObject3D: ApplicationObject3D) {
    let indexAdded = 0;
    for(const fqFileName of commitComparison.added) {
      const id = this.fqFileNameToMeshId(applicationObject3D, fqFileName); // class id
      const addedPackages = commitComparison.addedPackages[indexAdded];

      if(id){
        this.highlightingService.markAsAddedById(id);

        if(addedPackages !== "") {
          const clazz = getClassInApplicationById(applicationObject3D.data.application, id);
          let pckg : Package | undefined = clazz?.parent;
          const addedPackagesSplit = addedPackages.split(".");
          const firstAddedPackageName = addedPackagesSplit[0];
          while(pckg && pckg.name !== firstAddedPackageName) {
            this.highlightingService.markAsAddedById(pckg.id);
            pckg = pckg.parent;
          }
          if(pckg) {
            this.highlightingService.markAsAddedById(pckg.id);
          }
        }
      }
      indexAdded++;
    }
  }

  private visualizeDeletedPackagesAndClasses(commitComparison: CommitComparison, applicationObject3D: ApplicationObject3D) {
    let indexDeleted = 0;
    for(const fqFileName of commitComparison.deleted) {
      const id = this.fqFileNameToMeshId(applicationObject3D, fqFileName);
      const deletedPackages = commitComparison.deletedPackages[indexDeleted];


      if(id){
        this.highlightingService.markAsDeletedById(id);
        if(deletedPackages !== "") {
          const clazz = getClassInApplicationById(applicationObject3D.data.application, id);
          let pckg : Package | undefined = clazz?.parent;
          const deletedPackagesSplit = deletedPackages.split(".");
          const firstDeletedPackageName = deletedPackagesSplit[0];
          while(pckg && pckg.name !== firstDeletedPackageName) {
            this.highlightingService.markAsDeletedById(pckg.id);
            pckg = pckg.parent;
          }
          if(pckg) {
            this.highlightingService.markAsDeletedById(pckg.id);
          }
        }
      }
      indexDeleted++;
    }
  }

  private visualizeModifiedPackagesAndClasses(commitComparison: CommitComparison, applicationObject3D: ApplicationObject3D) {
    // only mark classes as modified. Why? Because if we decided to apply the added/deleted package visualization, we would 
    // have to mark every parent package as modified. The design choice is to not do that as it seems overloaded

    for(const fqFileName of commitComparison.modified) {
      const id = this.fqFileNameToMeshId(applicationObject3D, fqFileName);

      if(id){
        this.highlightingService.markAsModifiedById(id);
      }
    }
  }


  visualizeDeletedCommunicationLinks(commitComparison: CommitComparison, applicationObject3D: ApplicationObject3D, 
    pipe: ClazzCommunicationMesh, clazz: Class) {
    for(const fqFileName of commitComparison.deleted) {
      const id = this.fqFileNameToMeshId(applicationObject3D, fqFileName); // class id
      if(id && clazz.id === id) {
        this.highlightingService.markAsDeletedById(pipe.dataModel.id);
        return;
      }
    }
  }
  
  visualizeAddedCommunicationLinks(commitComparison: CommitComparison, applicationObject3D: ApplicationObject3D, 
    pipe: ClazzCommunicationMesh, clazz: Class) {
    for(const fqFileName of commitComparison.added) {
      const id = this.fqFileNameToMeshId(applicationObject3D, fqFileName); // class id
      if(id && clazz.id === id) {
        this.highlightingService.markAsAddedById(pipe.dataModel.id);
        return;
      }
    }
  }

  visualizeChangedCommunicationLinks(commitComparison: CommitComparison, applicationObject3D: ApplicationObject3D, 
    pipe: ClazzCommunicationMesh, clazz: Class) {
    for(const fqFileName of commitComparison.modified) {
      const id = this.fqFileNameToMeshId(applicationObject3D, fqFileName); // class id
      if(id && clazz.id === id) {
        // find out if at least one modified method is involved in communication of second selected commit

        //const firstSelectedCommitMethodCalls = pipe.dataModel.communication.methodCalls[0] as MethodCall[];
        const secondSelectedCommitMethodCalls = pipe.dataModel.communication.methodCalls[1] as MethodCall[];

        console.log("commitComparison: ", commitComparison);

        let name = "";
        for(const methodCall of secondSelectedCommitMethodCalls) {
          if(methodCall.sourceClass.id === id) {
            name = methodCall.callerMethodName;
          }else if(methodCall.targetClass.id === id) {
            name = methodCall.operationName;
          }

          if(name !== "") { console.log("NAME => ", name);
            for(const metric of commitComparison.metrics) { // check if method is modified
              const methodNameSplit = metric.entityName.split("#");
              const methodName = methodNameSplit[0];
              if(methodName.endsWith(name)) {
                //let isModified : boolean = false;

                // future work: adapt code-agent such that it sends the names of the modified methods
                // to the code-service. Relying on the loc metric alone doesn't detect the case where
                // a modified method still has the same number of code lines.
                if(metric.metricMap.loc?.newValue !== metric.metricMap.loc?.oldValue) { 
                  //isModified = true;
                  this.highlightingService.markAsModifiedById(pipe.dataModel.id);
                  return;
                }

              }
            }


          }
        }


        // const methodCallsBothCommits = firstSelectedCommitMethodCalls.filter(
        //   methodCall => secondSelectedCommitMethodCalls.find(mc => mc.id === methodCall.id)
        // );

        // console.log("methodCallsBothCommits: ", methodCallsBothCommits);

       

        console.log("pipe datamodel communication methodcalls ", pipe.dataModel.communication.methodCalls);
        return;
      }
    }
  }

  // handle extern communication links
  visualizeCommitComparisonCommunicationLinks(pipe: ClazzCommunicationMesh, classCommunication: ClassCommunication) {
    const selectedApplication = this.selectedApplication;
    const selectedCommits = this.selectedCommits;

    if(!selectedApplication || !selectedCommits) return;

    const commits = selectedCommits.get(selectedApplication);

    const sourceApp = classCommunication.sourceApp;
    const targetApp = classCommunication.targetApp;
    

    if(!commits || commits.length !== 2) { // remove texture. TODO: if this approach produces a bug in
      // combination with the restructure feature, put this kind of code to visualization.ts when
      // deselecting the second selected commit
      if (pipe.material instanceof THREE.MeshBasicMaterial ||
          pipe.material instanceof THREE.MeshLambertMaterial ||
          pipe.material instanceof MeshLineMaterial) {
        pipe.material.map = null;
      }
      return;
    }

    const ids = [commits[0].commitId, commits[1].commitId];
    const id = ids.join("_");

    const commitComparison = this.commitComparisonRepo.getById(id);
    if(!commitComparison) return;

    if(sourceApp.name === selectedApplication) {
      const appObj = this.getApplicationById(sourceApp.id);
      if(appObj) {
        const sourceClass = classCommunication.sourceClass;
        this.visualizeAddedCommunicationLinks(commitComparison, appObj, pipe, sourceClass);
        this.visualizeDeletedCommunicationLinks(commitComparison, appObj, pipe, sourceClass);
        this.visualizeChangedCommunicationLinks(commitComparison, appObj, pipe, sourceClass);
      }
    } else if(targetApp.name === selectedApplication) { 
      const appObj = this.getApplicationById(targetApp.id);
      if(appObj) {
        const targetClass = classCommunication.targetClass;
        this.visualizeAddedCommunicationLinks(commitComparison, appObj, pipe, targetClass);
        this.visualizeDeletedCommunicationLinks(commitComparison, appObj, pipe, targetClass);
        this.visualizeChangedCommunicationLinks(commitComparison, appObj, pipe, targetClass);
      }
    }
  }

  getCommitComparison(applicationObject3D: ApplicationObject3D) {

    if(this.selectedApplication && applicationObject3D.data.application.name === this.selectedApplication && 
        this.selectedCommits?.get(this.selectedApplication)?.length == 2) {
      const commits = this.selectedCommits!.get(applicationObject3D.data.application.name)!;
      const ids = [commits[0].commitId, commits[1].commitId];
      const id = ids.join("_");
      const commitComparison = this.commitComparisonRepo.getById(id);
      return commitComparison;
    }
    return undefined;
  }

  visualizeCommitComparisonPackagesAndClasses(applicationObject3D: ApplicationObject3D, commitComparison: CommitComparison){
    this.visualizeAddedPackagesAndClasses(commitComparison, applicationObject3D);
    this.visualizeDeletedPackagesAndClasses(commitComparison, applicationObject3D);
    this.visualizeModifiedPackagesAndClasses(commitComparison, applicationObject3D);
  }

  public fqFileNameToMeshId(applicationObject3D: ApplicationObject3D, fqFileName: string): string | undefined {
    try {
      console.log("fqFileName::::::: ", fqFileName);
      // TODO: improve time complexity by getting rid of the prefix in fqFileName that has nothing to do with the landscape (we need to adapt the code-agent for that purpose)
      // Then we can do a top-down approach (exact matching) instead of this bottom-up approach

      const clazzes = getAllClassesInApplication(applicationObject3D.data.application);
      const split1 = fqFileName.split("/");
      const prefixAndPackageNames = split1.slice(0, split1.length-1);
      const split2 = split1[split1.length - 1].split(".");
      const className = split2[split2.length - 2];

      const candidates = clazzes.filter(clazz => clazz.name === className);

      for(const candidate of candidates) {
        //console.log("candidate: ", candidate.name);
        const packages = getClassAncestorPackages(candidate);
        let index = prefixAndPackageNames.length - 1;
        for(const pckg of packages.slice().reverse()) {
          if(index < 0) {
            break;
          }
          if(pckg.name === prefixAndPackageNames[index]) {
            index--;
          }else {
            break;
          }
        }
        return candidate.id;
      }
      return undefined;
    } catch (error) {
      console.log(error);
      return undefined;
    }


    // const candidates : number[] = []; // fqFileName contains some prefix that isn't important for now. TODO: improve code-agent such that this prefix 
    // // is not sent to our code-service and therefore safe us some effort by using exact matching
    // applicationObject3D.data.application.packages.forEach(pckg => {
    //   console.log("check pckg: ", pckg.name);
    //   if(fqFileName.indexOf(pckg.name) !== -1) {
    //     candidates.push();
    //   }
    // });

    // console.log("search in " + fqFileName + " for " + applicationObject3D.data.application.name + ": " +  candidates);
  }


  private removeCommitComparisonVisualization(applicationObject3D: ApplicationObject3D){
    const packages = getAllPackagesInApplication(applicationObject3D.data.application);
    const classes = getAllClassesInApplication(applicationObject3D.data.application);
    packages.forEach(pckg => {
      const mesh = this.getBoxMeshByModelId(pckg.id);
      if(mesh && 
        (mesh.material instanceof THREE.MeshBasicMaterial ||
        mesh.material instanceof THREE.MeshLambertMaterial ||
        mesh.material instanceof MeshLineMaterial)
        ){
        mesh.material.map = null;
      }
    });
    classes.forEach(clazz => {
      const mesh = this.getBoxMeshByModelId(clazz.id);
      if(mesh && 
        (mesh.material instanceof THREE.MeshBasicMaterial ||
        mesh.material instanceof THREE.MeshLambertMaterial ||
        mesh.material instanceof MeshLineMaterial)
        ){
        mesh.material.map = null;
      }
    });
  }


  private hideVisualization(applicationObject3D: ApplicationObject3D, structure?: StructureLandscapeData) {
    structure?.nodes.forEach(node => {
      const app = node.applications.find(a => a.id === applicationObject3D.data.application.id);
      if(app) {
        if(app.packages.length === applicationObject3D.data.application.packages.length) {
          // hide everything (including foundation)

          applicationObject3D.hideMeshes();
          applicationObject3D.getCommMeshes().forEach((commMesh) => {
            commMesh.hide();
          });
          this.linkRenderer.getAllLinks().forEach(externPipe => {
            if(externPipe.dataModel.communication.sourceApp.id === applicationObject3D.data.application.id
              || 
              externPipe.dataModel.communication.targetApp.id === applicationObject3D.data.application.id) {
                externPipe.hide();
              }
          });
        } else {
          // hide partial 
          app.packages.forEach(pckg => {
            const packageMesh = applicationObject3D.getMeshById(pckg.id);
            if(packageMesh) {
              packageMesh.hide();
              const subPackages = getSubPackagesOfPackage(pckg);
              const clazzes = getClassesInPackage(pckg);
              subPackages.forEach(subPckg => {
                const subPackageMesh = applicationObject3D.getMeshById(subPckg.id);
                if(subPackageMesh){
                  subPackageMesh.hide();
                }
              });
              clazzes.forEach(clss => {
                const clazzMesh = applicationObject3D.getMeshById(clss.id);
                if(clazzMesh){
                  clazzMesh.hide();
                }
              });
            }
          });

          applicationObject3D.getCommMeshes().forEach((commMesh) => {
            const sourceClass = (commMesh.dataModel.communication as ClassCommunication).sourceClass;
            const targetClass = (commMesh.dataModel.communication as ClassCommunication).targetClass;
            const sourceClassMesh = applicationObject3D.getMeshById(sourceClass.id);
            const targetClassMesh = applicationObject3D.getMeshById(targetClass.id);
            if(sourceClassMesh){
              if(!sourceClassMesh.visible){
                commMesh.hide();
              }
            }
            if(targetClassMesh){
              if(!targetClassMesh.visible){
                commMesh.hide();
              }
            }
          });

          this.linkRenderer.getAllLinks().forEach(externPipe => {
            const sourceClass = externPipe.dataModel.communication.getClasses().length !== 0 && externPipe.dataModel.communication.getClasses()[0];
            const targetClass = externPipe.dataModel.communication.getClasses().length !== 0 && externPipe.dataModel.communication.getClasses()[1];
            if(sourceClass){
              if(applicationHasClass(app, sourceClass)){
                externPipe.hide();
              }
            }
            if(targetClass){
              if(applicationHasClass(app, targetClass)){
                externPipe.hide();
              }
            }
          });
        }
      }
    });
  }

  private showVisualization(applicationObject3D: ApplicationObject3D, structure?: StructureLandscapeData) {
    structure?.nodes.forEach(node => {
      const app = node.applications.find(a => a.id === applicationObject3D.data.application.id);
      if(app) {
        if(app.packages.length === applicationObject3D.data.application.packages.length) {
          // show everything (including foundation)

          applicationObject3D.showMeshes();
          applicationObject3D.getCommMeshes().forEach((commMesh) => {
            commMesh.show();
          });
          this.linkRenderer.getAllLinks().forEach(externPipe => {
            if((externPipe.dataModel.communication.sourceApp.id === applicationObject3D.data.application.id)
              || 
              (externPipe.dataModel.communication.targetApp.id === applicationObject3D.data.application.id)) {
                externPipe.show(); // Note that if the source is visible so must be the target and vice versa (according to the inherent logic of the dynamic structure)
              }
          });
        } else {
          // show partial 
          const foundationMesh = applicationObject3D.foundationMesh;
          foundationMesh?.show();
          app.packages.forEach(pckg => {
            const packageMesh = applicationObject3D.getMeshById(pckg.id);
            if(packageMesh) {
              packageMesh.show();
              const subPackages = getSubPackagesOfPackage(pckg);
              const clazzes = getClassesInPackage(pckg);
              subPackages.forEach(subPckg => {
                const subPackageMesh = applicationObject3D.getMeshById(subPckg.id);
                if(subPackageMesh){
                  subPackageMesh.show();
                }
              });
              clazzes.forEach(clss => {
                const clazzMesh = applicationObject3D.getMeshById(clss.id);
                if(clazzMesh){
                  clazzMesh.show();
                }
              });
            }
          });

          applicationObject3D.getCommMeshes().forEach((commMesh) => {
            const sourceClass = (commMesh.dataModel.communication as ClassCommunication).sourceClass;
            const targetClass = (commMesh.dataModel.communication as ClassCommunication).targetClass;
            const sourceClassMesh = applicationObject3D.getMeshById(sourceClass.id);
            const targetClassMesh = applicationObject3D.getMeshById(targetClass.id);
            if(sourceClassMesh){
              if(!sourceClassMesh.visible){
                commMesh.show();
              }
            }
            if(targetClassMesh){
              if(!targetClassMesh.visible){
                commMesh.show();
              }
            }
          });

          this.linkRenderer.getAllLinks().forEach(externPipe => {
            const sourceClass = externPipe.dataModel.communication.getClasses().length !== 0 && externPipe.dataModel.communication.getClasses()[0];
            const targetClass = externPipe.dataModel.communication.getClasses().length !== 0 && externPipe.dataModel.communication.getClasses()[1];
            if(sourceClass){
              if(applicationHasClass(app, sourceClass)){
                externPipe.show();
              }
            }
            if(targetClass){
              if(applicationHasClass(app, targetClass)){
                externPipe.show();
              }
            }
          });



        }
      }
    });
  }

  /**
   * Triggers the 'renderSettingChanged' event for updating the landscape
   * @method renderSettingChanged
   */
  renderSettingChanged(renderMode: RenderMode) {
    this.trigger('renderSettingChanged', renderMode);
  }




  // #region @actions

  @action
  addCommunication(applicationObject3D: ApplicationObject3D) {
    const commitComparison = this.getCommitComparison(applicationObject3D);
    if(commitComparison) {
      // may change some inner communication links' texture
      this.appCommRendering.addCommunication(
        applicationObject3D,
        this.userSettings.applicationSettings,
        commitComparison,
        this
      );
      return;
    }
    
    this.appCommRendering.addCommunication(
      applicationObject3D,
      this.userSettings.applicationSettings,
    );
  }

  @action
  addCommunicationForAllApplications() {
    this.forEachOpenApplication(this.addCommunication);
    this.updateLinks?.();
  }

  @action
  removeCommunicationForAllApplications() {
    this.forEachOpenApplication(this.removeCommunication);
  }

  @action
  updateApplicationObject3DAfterUpdate(
    applicationObject3D: ApplicationObject3D
  ) {
    // Render communication
    if (
      this.localUser.visualizationMode !== 'ar' ||
      this.arSettings.renderCommunication
    ) {
      this.addCommunication(applicationObject3D);
    }

    // Update labels
    Labeler.addApplicationLabels(
      applicationObject3D,
      this.font,
      this.userSettings.applicationColors
    );
    // Update links
    this.updateLinks?.();
    // Update highlighting
    this.highlightingService.updateHighlighting(); // needs to be after update links
  }

  updateLinks?: () => void;

  @action
  openAllComponentsOfAllApplications() {
    this.forEachOpenApplication(this.openAllComponents);
  }

  /**
   * Toggles the visualization of communication lines.
   */
  @action
  toggleCommunicationRendering() {
    this.configuration.isCommRendered = !this.configuration.isCommRendered;
    if (this.configuration.isCommRendered) {
      this.addCommunicationForAllApplications();
    } else {
      this.removeCommunicationForAllApplications();
    }
    this.updateLinks?.();
  }

  /**
   * Opens all parents / components of a given component or clazz.
   * Adds communication and restores highlighting.
   *
   * @param entity Component or Clazz of which the mesh parents shall be opened
   */
  @action
  openParents(entity: Package | Class | EntityMesh, applicationId: string) {
    let entityModel = entity;

    if (!entity) {
      return;
    }

    // do not re-calculate if mesh is already visible
    if (isEntityMesh(entityModel)) {
      if (entityModel.visible) {
        return;
      } else {
        entityModel = (entity as EntityMesh).dataModel as Package | Class;
      }
    }

    const applicationObject3D = this.getApplicationById(applicationId);
    if (!applicationObject3D) {
      return;
    }

    EntityManipulation.openComponentsByList(
      EntityManipulation.getAllAncestorComponents(entityModel),
      applicationObject3D
    );

    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  // #endregion @actions

  // #region utility methods

  openAllComponents(applicationObject3D: ApplicationObject3D) {
    this.openAllComponentsLocally(applicationObject3D);
  }

  toggleComponentLocally(
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D
  ) {
    EntityManipulation.toggleComponentMeshState(
      componentMesh,
      applicationObject3D,
      this.appSettings.keepHighlightingOnOpenOrClose.value
    );
    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  toggleComponent(
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D
  ) {
    this.toggleComponentLocally(componentMesh, applicationObject3D);

    this.sender.sendComponentUpdate(
      applicationObject3D.getModelId(),
      componentMesh.getModelId(),
      componentMesh.opened,
      false
    );

    if (!componentMesh.opened) {
      // let the backend know that the subpackages are closed too
      const subPackages = getSubPackagesOfPackage(componentMesh.dataModel);
      subPackages.forEach((subPackage) => {
        this.sender.sendComponentUpdate(
          applicationObject3D.getModelId(),
          subPackage.id,
          false,
          false,
          false // needed so that the backend doesn't forward this message
        );
      });
    }
  }

  openAllComponentsLocally(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.openAllComponents(applicationObject3D, this.sender);

    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  closeAllComponentsLocally(applicationObject3D: ApplicationObject3D) {
    EntityManipulation.closeAllComponents(
      applicationObject3D,
      this.appSettings.keepHighlightingOnOpenOrClose.value
    );
    this.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  closeAllComponents(applicationObject3D: ApplicationObject3D) {
    this.closeAllComponentsLocally(applicationObject3D);

    this.sender.sendComponentUpdate(
      applicationObject3D.getModelId(),
      '',
      false,
      true
    );
  }

  updateCommunication() {
    this.getOpenApplications().forEach((application) => {
      if (this.arSettings.renderCommunication) {
        this.appCommRendering.addCommunication(
          application,
          this.userSettings.applicationSettings
        );
      } else {
        application.removeAllCommunication();
      }
    });
  }

  removeApplicationLocally(application: ApplicationObject3D) {
    application.parent?.remove(application);
    application.removeAllEntities();
    this.openApplicationsMap.delete(application.getModelId());
  }

  removeApplicationLocallyById(applicationId: string) {
    const application = this.getApplicationById(applicationId);
    application && this.removeApplicationLocally(application);
  }

  removeCommunication(application: ApplicationObject3D) {
    if (application.highlightedEntity instanceof ClazzCommunicationMesh) {
      removeAllHighlightingFor(application);
    }

    application.removeAllCommunication();
  }

  forEachOpenApplication(forEachFunction: (app: ApplicationObject3D) => void) {
    this.getOpenApplications().forEach((application) => {
      forEachFunction.call(this, application);
    });
  }

  restoreFromSerialization(room: SerializedRoom) {
    this.cleanup();

    this.linkRenderer.getAllLinks().forEach((externLink) => {
      externLink.unhighlight();
      externLink.turnOpaque();
    });

    room.openApps.forEach(async (app) => {
      const applicationData = this.applicationRepo.getById(app.id);
      if (applicationData) {
        await this.addApplicationTask.perform(
          applicationData,
          this.roomSerializer.serializeToAddApplicationArgs(app)
        );
      }
    });

    if (room.highlightedExternCommunicationLinks) {
      room.highlightedExternCommunicationLinks.forEach((externLink) => {
        const linkMesh = this.linkRenderer.getLinkById(externLink.entityId);
        if (linkMesh) {
          this.highlightingService.highlight(linkMesh, {
            sendMessage: false,
            remoteColor: new THREE.Color().fromArray(externLink.color),
          });
        }
      });
    }
    this.highlightingService.updateHighlighting();
  }

  cleanup() {
    this.forEachOpenApplication(this.removeApplicationLocally);
    this.openApplicationsMap.clear();
  }

  static convertToBoxLayoutMap(layoutedApplication: Map<string, LayoutData>) {
    const boxLayoutMap: Map<string, BoxLayout> = new Map();

    layoutedApplication.forEach((value, key) => {
      const boxLayout = new BoxLayout();
      boxLayout.positionX = value.positionX;
      boxLayout.positionY = value.positionY;
      boxLayout.positionZ = value.positionZ;
      boxLayout.width = value.width;
      boxLayout.height = value.height;
      boxLayout.depth = value.depth;
      boxLayoutMap.set(key, boxLayout);
    });

    return boxLayoutMap;
  }

  // #endregion utility methods
}

// #region typescript types
export type LayoutData = {
  height: number;
  width: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
};

export type AddApplicationArgs = {
  position?: THREE.Vector3;
  quaternion?: THREE.Quaternion;
  scale?: THREE.Vector3;
  transparentComponents?: Set<string>;
  openComponents?: Set<string>;
  highlightedComponents?: HightlightComponentArgs[];
};
// #endregion typescript types

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'application-renderer': ApplicationRenderer;
  }
}
