// #region Imports
import { create } from 'zustand';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import CommunicationRendering from 'explorviz-frontend/src/utils/application-rendering/communication-rendering';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/src/utils/application-rendering/entity-rendering';
import {
  HightlightComponentArgs,
  removeAllHighlightingFor,
} from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import * as Labeler from 'explorviz-frontend/src/utils/application-rendering/labeler';
import {
  Class,
  getApplicationsFromNodes,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import * as THREE from 'three';
import { useARSettingsStore } from 'explorviz-frontend/src/stores/extended-reality/ar-settings';
import VrApplicationObject3D from 'explorviz-frontend/src/utils/extended-reality/view-objects/application/vr-application-object-3d';
import { useConfigurationStore } from './configuration';
import { useApplicationRepositoryStore } from './repos/application-repository';
import { useFontRepositoryStore } from 'explorviz-frontend/src/stores/repos/font-repository';
import { useUserSettingsStore } from './user-settings';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import { getSubPackagesOfPackage } from 'explorviz-frontend/src/utils/package-helpers';
import { useHighlightingStore } from './highlighting';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import { SerializedRoom } from 'explorviz-frontend/src/utils/collaboration/web-socket-messages/types/serialized-room';
import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { CommitComparison } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import {
  getAllClassesInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import { MeshLineMaterial } from 'meshline';
import { FlatDataModelBasicInfo } from 'explorviz-frontend/src/utils/flat-data-schemes/flat-data';
import { useTextureServiceStore } from 'explorviz-frontend/src/stores/texture-service';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import layoutLandscape from 'explorviz-frontend/src/utils/elk-layouter';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
// #endregion imports

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

interface ApplicationRendererState {
  landscape3D: Landscape3D | null;
  openApplicationsMap: Map<string, ApplicationObject3D>;
  appCommRendering: CommunicationRendering;
  setLandscape3D: (value: Landscape3D) => void;
  appSettings: () => any;
  getApplicationById: (id: string) => ApplicationObject3D | undefined;
  getBoxMeshByModelId: (id: string) => EntityMesh | null;
  getCommunicationMeshById: (id: string) => ClazzCommunicationMesh | null;
  getClassCommunications: (
    applicationObjetc3D: ApplicationObject3D
  ) => ClassCommunication[];
  getPositionInLandscape: (mesh: THREE.Object3D) => THREE.Vector3;
  getMeshById: (meshId: string) => BaseMesh | undefined;
  getApplicationIdByMeshId: (meshId: string) => string | undefined;
  getOpenApplications: () => ApplicationObject3D[];
  getOpenApplicationIds: () => string[];
  isApplicationOpen: (id: string) => boolean;
  addApplicationTask: (
    applicationData: ApplicationData,
    addApplicationArgs?: AddApplicationArgs
  ) => Promise<ApplicationObject3D>;
  updateLabel: (entityId: string, label: string) => void;
  addCommunication: (applicationObject3D: ApplicationObject3D) => void;
  addCommunicationForAllApplications: () => void;
  removeCommunicationForAllApplications: () => void;
  updateApplicationObject3DAfterUpdate: (
    applicationObject3D: ApplicationObject3D
  ) => void;
  closeAllComponentsOfAllApplications: () => void;
  openAllComponentsOfAllApplications: () => void;
  toggleCommunicationRendering: () => void;
  openParents: (
    entity: Package | Class | EntityMesh,
    applicationId: string
  ) => void;
  openAllComponents: (applicationObject3D: ApplicationObject3D) => void;
  toggleComponent: (
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D
  ) => void;
  toggleComponentLocally: (
    componentMesh: ComponentMesh,
    applicationObject3D: ApplicationObject3D
  ) => void;
  openAllComponentsLocally: (applicationObject3D: ApplicationObject3D) => void;
  closeAllComponentsLocally: (applicationObject3D: ApplicationObject3D) => void;
  closeAllComponents: (applicationObject3D: ApplicationObject3D) => void;
  updateCommunication: () => void;
  removeApplicationLocally: (application: ApplicationObject3D) => void;
  removeApplicationLocallyById: (applicationId: string) => void;
  removeCommunication: (application: ApplicationObject3D) => void;
  forEachOpenApplication: (
    forEachFunction: (app: ApplicationObject3D) => void
  ) => void;
  restoreFromSerialization: (room: SerializedRoom) => void;
  updateApplicationLayout: () => Promise<void>;
  _visualizeCommitComparisonPackagesAndClasses: (
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) => void;
  _getFlatDataModelForBestFqnMatch: (
    applicationData: ApplicationData,
    fqFileName: string
  ) => FlatDataModelBasicInfo | null;
  _visualizeAddedPackagesAndClasses: (
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) => void;
  _visualizeDeletedPackagesAndClasses: (
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) => void;
  _visualizeModifiedPackagesAndClasses: (
    applicationData: ApplicationData,
    commitComparison: CommitComparison
  ) => void;
  _removeCommitComparisonVisualization: (
    applicationData: ApplicationData
  ) => void;
  cleanup: () => void;
  setOpenApplicationsMap: (value: Map<string, ApplicationObject3D>) => void;
}

export const useApplicationRendererStore = create<ApplicationRendererState>(
  (set, get) => ({
    landscape3D: null,
    openApplicationsMap: new Map(),
    appCommRendering: new CommunicationRendering(),

    setLandscape3D: (value: Landscape3D) => set({ landscape3D: value }),

    setOpenApplicationsMap: (value: Map<string, ApplicationObject3D>) => {
      set({ openApplicationsMap: value });
    },

    appSettings: () => {
      return useUserSettingsStore.getState().visualizationSettings;
    },

    getApplicationById: (id: string): ApplicationObject3D | undefined => {
      return get().openApplicationsMap.get(id);
    },

    getBoxMeshByModelId: (id: string) => {
      for (const application of get().getOpenApplications()) {
        const mesh = application.getBoxMeshByModelId(id);
        if (mesh) return mesh;
      }
      return null;
    },

    getCommunicationMeshById: (id: string) => {
      for (const application of get().getOpenApplications()) {
        const mesh = application.getCommMeshByModelId(id);
        if (mesh) return mesh;
      }
      return null;
    },

    getClassCommunications: (applicationObjetc3D: ApplicationObject3D) => {
      const applicationData = useApplicationRepositoryStore
        .getState()
        .getById(applicationObjetc3D.getModelId());
      return applicationData?.classCommunications || [];
    },

    getPositionInLandscape: (mesh: THREE.Object3D) => {
      const landscapePosition = new THREE.Vector3();
      mesh.getWorldPosition(landscapePosition);
      get().landscape3D!.worldToLocal(landscapePosition);
      return landscapePosition;
    },

    getMeshById: (meshId: string): BaseMesh | undefined => {
      return (
        get().getBoxMeshByModelId(meshId) ||
        get().getCommunicationMeshById(meshId) ||
        useLinkRendererStore.getState().getLinkById(meshId)
      );
    },

    /**
     * Returns application id of the application which contains the mesh with the given id, if existend. Else undefined.
     *
     * @param id The mesh's id to lookup
     */
    getApplicationIdByMeshId: (meshId: string) => {
      for (const application of get().getOpenApplications()) {
        const mesh = application.getMeshById(meshId);
        if (mesh) return application.getModelId();
      }
      return undefined;
    },

    getOpenApplications: (): ApplicationObject3D[] => {
      return get().openApplicationsMap.values()
        ? Array.from(get().openApplicationsMap.values())
        : [];
    },

    getOpenApplicationIds: () => {
      return Array.from(get().openApplicationsMap.keys());
    },

    isApplicationOpen: (id: string): boolean => {
      return get().openApplicationsMap.has(id);
    },

    // This was a Ember task before migration
    addApplicationTask: async (
      applicationData: ApplicationData,
      addApplicationArgs: AddApplicationArgs = {}
    ) => {
      const applicationModel = applicationData.application;
      const boxLayoutMap = applicationData.boxLayoutMap;
      const isOpen = get().isApplicationOpen(applicationModel.id);
      let app3D = get().getApplicationById(applicationModel.id);

      if (!app3D) {
        app3D = new VrApplicationObject3D(applicationData);
        let newOpenApplicationsMap = new Map(get().openApplicationsMap);
        newOpenApplicationsMap.set(applicationModel.id, app3D);
        set({ openApplicationsMap: newOpenApplicationsMap });
      }

      // Check if new classes have been discovered
      const oldClassCount = app3D.getClassMeshes().length;
      const newClassCount = applicationData.getClasses().length;
      // Might happen in evolution that we have no classes at all
      const hasStructureChanged =
        oldClassCount === 0 || oldClassCount !== newClassCount;

      const applicationState =
        Object.keys(addApplicationArgs).length === 0 &&
        isOpen &&
        hasStructureChanged
          ? useRoomSerializerStore
              .getState()
              .serializeToAddApplicationArgs(app3D)
          : addApplicationArgs;

      // Set layout properties
      const appLayout = boxLayoutMap.get(applicationData.getId());
      if (appLayout) {
        app3D.position.copy(appLayout.position);
      }

      if (hasStructureChanged) {
        app3D.removeAll();

        // Add new meshes to application
        EntityRendering.addFoundationAndChildrenToApplication(
          app3D,
          useUserSettingsStore.getState().colors!,
          useFontRepositoryStore.getState().font!
        );

        // Restore state of open packages and transparent components (packages and classes)
        EntityManipulation.restoreComponentState(
          app3D,
          applicationState.openComponents,
          applicationState.transparentComponents,
          useHighlightingStore.getState().opacity()
        );
      } else {
        // Layout may have been changed in settings
        app3D.updateLayout();
      }

      get().addCommunication(app3D);

      // reset transparency of inner communication links
      app3D.getCommMeshes().forEach((commMesh) => {
        if (applicationState.transparentComponents?.has(commMesh.getModelId()))
          commMesh.turnTransparent(useHighlightingStore.getState().opacity());
      });

      // reset transparency of extern communication links

      applicationState.transparentComponents?.forEach((id) => {
        const externLinkMesh = useLinkRendererStore.getState().getLinkById(id);
        if (externLinkMesh) {
          externLinkMesh.turnTransparent(
            useHighlightingStore.getState().opacity()
          );
        }
      });

      // Reset highlights -------------------

      const currentSetting =
        useUserSettingsStore.getState().visualizationSettings
          .enableMultipleHighlighting.value;
      let newVisualizationSettings =
        useUserSettingsStore.getState().visualizationSettings;
      newVisualizationSettings.enableMultipleHighlighting.value = true;
      useUserSettingsStore.setState({
        visualizationSettings: newVisualizationSettings,
      }); // so resetting multiple highlights within one application won't reset them
      applicationState.highlightedComponents?.forEach(
        (highlightedComponent) => {
          useHighlightingStore
            .getState()
            .toggleHighlightById(
              highlightedComponent.entityId,
              highlightedComponent.color
            );
        }
      );
      newVisualizationSettings =
        useUserSettingsStore.getState().visualizationSettings;
      newVisualizationSettings.enableMultipleHighlighting.value =
        currentSetting;
      useUserSettingsStore.setState({
        visualizationSettings: newVisualizationSettings,
      });
      // ----------------------------------------

      // this.heatmapConf.updateActiveApplication(applicationObject3D);

      const commitComparison = useEvolutionDataRepositoryStore
        .getState()
        .getCommitComparisonByAppName(applicationModel.name);

      if (commitComparison) {
        get()._visualizeCommitComparisonPackagesAndClasses(
          applicationData,
          commitComparison
        );
      } else {
        // remove existing comparison visualizations
        get()._removeCommitComparisonVisualization(applicationData);
      }

      return app3D;
    },

    updateLabel: (entityId: string, label: string) => {
      const appId = get().getApplicationIdByMeshId(entityId);
      const applicationObject3D = get().getApplicationById(appId!);

      const boxMesh = applicationObject3D!.getBoxMeshByModelId(entityId) as
        | ComponentMesh
        | FoundationMesh;

      const { componentTextColor, foundationTextColor } =
        useUserSettingsStore.getState().colors!;

      if (boxMesh instanceof ComponentMesh) {
        Labeler.updateBoxTextLabel(
          boxMesh,
          useFontRepositoryStore.getState().font!,
          componentTextColor,
          label
        );
      } else if (boxMesh instanceof FoundationMesh) {
        Labeler.updateBoxTextLabel(
          boxMesh,
          useFontRepositoryStore.getState().font!,
          foundationTextColor,
          label
        );
      }

      get().updateApplicationObject3DAfterUpdate(applicationObject3D!);
    },

    addCommunication: (applicationObject3D: ApplicationObject3D) => {
      let newAppCommRendering = get().appCommRendering;
      newAppCommRendering.addCommunication(
        applicationObject3D,
        useUserSettingsStore.getState().visualizationSettings
      );
      set({ appCommRendering: newAppCommRendering });
    },

    addCommunicationForAllApplications: () => {
      get().forEachOpenApplication(get().addCommunication);
      useLinkRendererStore.getState().updateLinkPositions();
    },

    removeCommunicationForAllApplications: () => {
      get().forEachOpenApplication(get().removeCommunication);
    },

    updateApplicationObject3DAfterUpdate: (
      applicationObject3D: ApplicationObject3D
    ) => {
      // Update links
      useLinkRendererStore.getState().updateLinkPositions();
      // Update highlighting
      useHighlightingStore.getState().updateHighlighting(); // needs to be after update links
    },

    openAllComponentsOfAllApplications: () => {
      get().forEachOpenApplication(get().openAllComponents);
    },

    closeAllComponentsOfAllApplications: () => {
      get().forEachOpenApplication(get().closeAllComponents);
    },

    /**
     * Toggles the visualization of communication lines.
     */
    toggleCommunicationRendering: () => {
      useConfigurationStore.setState({
        isCommRendered: !useConfigurationStore.getState().isCommRendered,
      });
      if (useConfigurationStore.getState().isCommRendered) {
        get().addCommunicationForAllApplications();
      } else {
        get().removeCommunicationForAllApplications();
      }
      useLinkRendererStore.getState().updateLinkPositions();
    },

    /**
     * Opens all parents / components of a given component or clazz.
     * Adds communication and restores highlighting.
     *
     * @param entity Component or Clazz of which the mesh parents shall be opened
     */
    openParents: (
      entity: Package | Class | EntityMesh,
      applicationId: string
    ) => {
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

      const applicationObject3D = get().getApplicationById(applicationId);
      if (!applicationObject3D) {
        return;
      }

      EntityManipulation.openComponentsByList(
        EntityManipulation.getAllAncestorComponents(entityModel)
      );

      get().updateApplicationObject3DAfterUpdate(applicationObject3D);
    },

    openAllComponents: (applicationObject3D: ApplicationObject3D) => {
      get().openAllComponentsLocally(applicationObject3D);
    },

    toggleComponentLocally: (
      componentMesh: ComponentMesh,
      applicationObject3D: ApplicationObject3D
    ) => {
      EntityManipulation.toggleComponentState(componentMesh);
      get().updateApplicationObject3DAfterUpdate(applicationObject3D);
    },

    toggleComponent: (
      componentMesh: ComponentMesh,
      applicationObject3D: ApplicationObject3D
    ) => {
      get().toggleComponentLocally(componentMesh, applicationObject3D);

      useMessageSenderStore
        .getState()
        .sendComponentUpdate(
          applicationObject3D.getModelId(),
          componentMesh.getModelId(),
          componentMesh.opened,
          false
        );

      if (!componentMesh.opened) {
        // let the backend know that the subpackages are closed too
        const subPackages = getSubPackagesOfPackage(componentMesh.dataModel);
        subPackages.forEach((subPackage) => {
          useMessageSenderStore.getState().sendComponentUpdate(
            applicationObject3D.getModelId(),
            subPackage.id,
            false,
            false,
            false // needed so that the backend doesn't forward this message
          );
        });
      }
    },

    openAllComponentsLocally: (applicationObject3D: ApplicationObject3D) => {
      EntityManipulation.openAllComponents(
        applicationObject3D.dataModel.application
      );

      get().updateApplicationObject3DAfterUpdate(applicationObject3D);
    },

    closeAllComponentsLocally: (applicationObject3D: ApplicationObject3D) => {
      EntityManipulation.closeAllComponents(
        applicationObject3D.dataModel.application
      );
      get().updateApplicationObject3DAfterUpdate(applicationObject3D);
    },

    closeAllComponents: (applicationObject3D: ApplicationObject3D) => {
      get().closeAllComponentsLocally(applicationObject3D);

      useMessageSenderStore
        .getState()
        .sendComponentUpdate(applicationObject3D.getModelId(), '', false, true);
    },

    updateCommunication: () => {
      get()
        .getOpenApplications()
        .forEach((application) => {
          if (useARSettingsStore.getState().renderCommunication) {
            get().appCommRendering.addCommunication(
              application,
              useUserSettingsStore.getState().visualizationSettings
            );
          } else {
            application.removeAllCommunication();
          }
        });
    },

    removeApplicationLocally: (application: ApplicationObject3D) => {
      application.parent?.remove(application);
      application.removeAll();
      get().openApplicationsMap.delete(application.getModelId());
    },

    removeApplicationLocallyById: (applicationId: string) => {
      const application = get().getApplicationById(applicationId);
      application && get().removeApplicationLocally(application);
    },

    removeCommunication: (application: ApplicationObject3D) => {
      if (application.highlightedEntity instanceof ClazzCommunicationMesh) {
        removeAllHighlightingFor(application);
      }

      application.removeAllCommunication();
    },

    forEachOpenApplication: (
      forEachFunction: (app: ApplicationObject3D) => void
    ) => {
      get()
        .getOpenApplications()
        .forEach((application) => {
          forEachFunction(application);
        });
    },

    restoreFromSerialization: (room: SerializedRoom) => {
      get().cleanup();

      useLinkRendererStore
        .getState()
        .getAllLinks()
        .forEach((externLink) => {
          externLink.unhighlight();
          externLink.turnOpaque();
        });

      room.openApps.forEach(async (app) => {
        const applicationData = useApplicationRepositoryStore
          .getState()
          .getById(app.id);
        // const applicationData = this.applicationRepo.getById(app.id);
        if (applicationData) {
          await get().addApplicationTask(
            applicationData,
            useRoomSerializerStore.getState().serializeToAddApplicationArgs(app)
          );
        }
      });

      if (room.highlightedExternCommunicationLinks) {
        room.highlightedExternCommunicationLinks.forEach((externLink) => {
          const linkMesh = useLinkRendererStore
            .getState()
            .getLinkById(externLink.entityId);
          if (linkMesh) {
            useHighlightingStore.getState().highlight(linkMesh, {
              sendMessage: false,
              remoteColor: new THREE.Color().fromArray(externLink.color),
            });
          }
        });
      }
      useHighlightingStore.getState().updateHighlighting();
    },

    updateApplicationLayout: async () => {
      const boxLayoutMap = await layoutLandscape(
        get().landscape3D!.dataModel.structure.k8sNodes!,
        getApplicationsFromNodes(get().landscape3D!.dataModel.structure.nodes)
      );

      get().landscape3D!.layoutLandscape(boxLayoutMap);

      // Update communication since position of classes may have changed
      get().addCommunicationForAllApplications();
    },

    _visualizeCommitComparisonPackagesAndClasses: (
      applicationData: ApplicationData,
      commitComparison: CommitComparison
    ) => {
      get()._visualizeAddedPackagesAndClasses(
        applicationData,
        commitComparison
      );
      get()._visualizeDeletedPackagesAndClasses(
        applicationData,
        commitComparison
      );
      get()._visualizeModifiedPackagesAndClasses(
        applicationData,
        commitComparison
      );
    },

    _getFlatDataModelForBestFqnMatch: (
      applicationData: ApplicationData,
      fqFileName: string
    ): FlatDataModelBasicInfo | null => {
      const fqnToModelMap = applicationData.flatData.fqnToModelMap;

      // replace all occurences of / with .
      // (change in code service in the future)
      const fqFileNameDotDelimiter = fqFileName.replace(/\//g, '.');

      let longestKeyMatch = null;
      let flatDataModelBasicInfo: FlatDataModelBasicInfo | null = null;

      for (const [fqn, modelObj] of fqnToModelMap.entries()) {
        if (fqFileNameDotDelimiter.includes(fqn)) {
          if (!longestKeyMatch || fqn.length > longestKeyMatch.length) {
            longestKeyMatch = fqn;
            flatDataModelBasicInfo = modelObj;
          }
        }
      }
      return flatDataModelBasicInfo;
    },

    _visualizeAddedPackagesAndClasses: (
      applicationData: ApplicationData,
      commitComparison: CommitComparison
    ) => {
      commitComparison.added.forEach((fqFileName, index) => {
        const addedPackages = commitComparison.addedPackages[index];

        const flatDataModel = get()._getFlatDataModelForBestFqnMatch(
          applicationData,
          fqFileName
        );

        const id = flatDataModel?.modelId;

        if (id) {
          // Mark the class as added
          useTextureServiceStore
            .getState()
            .applyAddedTextureToMesh(get().getMeshById(id));

          if (addedPackages) {
            const clazz = flatDataModel.model as Class;
            let packageNode: Package | undefined = clazz?.parent;
            const addedPackageNames = addedPackages.split('.');
            const firstAddedPackageName = addedPackageNames[0];

            // Traverse up the package hierarchy and mark packages as added
            while (packageNode && packageNode.name !== firstAddedPackageName) {
              useTextureServiceStore
                .getState()
                .applyAddedTextureToMesh(get().getMeshById(packageNode.id));
              packageNode = packageNode.parent;
            }

            // Mark the first added package
            if (packageNode) {
              useTextureServiceStore
                .getState()
                .applyAddedTextureToMesh(get().getMeshById(packageNode.id));
            }
          }
        }
      });
    },

    _visualizeDeletedPackagesAndClasses: (
      applicationData: ApplicationData,
      commitComparison: CommitComparison
    ) => {
      commitComparison.deleted.forEach((fqFileName, index) => {
        const deletedPackages = commitComparison.deletedPackages[index];

        const flatDataModel = get()._getFlatDataModelForBestFqnMatch(
          applicationData,
          fqFileName
        );

        const id = flatDataModel?.modelId;

        if (id) {
          // Mark the class as deleted
          useTextureServiceStore
            .getState()
            .applyDeletedTextureToMesh(get().getMeshById(id));

          if (deletedPackages) {
            const clazz = flatDataModel.model as Class;
            let packageNode: Package | undefined = clazz?.parent;
            const deletedPackageNames = deletedPackages.split('.');
            const firstDeletedPackageName = deletedPackageNames[0];

            // Traverse up the package hierarchy and mark packages as deleted
            while (
              packageNode &&
              packageNode.name !== firstDeletedPackageName
            ) {
              useTextureServiceStore
                .getState()
                .applyDeletedTextureToMesh(get().getMeshById(packageNode.id));
              packageNode = packageNode.parent;
            }

            // Mark the first deleted package
            if (packageNode) {
              useTextureServiceStore
                .getState()
                .applyDeletedTextureToMesh(get().getMeshById(packageNode.id));
            }
          }
        }
      });
    },

    _visualizeModifiedPackagesAndClasses: (
      applicationData: ApplicationData,
      commitComparison: CommitComparison
    ) => {
      // only mark classes as modified. Why? Because if we decided to apply the added/deleted package visualization, we would
      // have to mark every parent package as modified. The design choice is to not do that as it seems overloaded

      for (const fqFileName of commitComparison.modified) {
        const id = get()._getFlatDataModelForBestFqnMatch(
          applicationData,
          fqFileName
        )?.modelId;

        if (id) {
          useTextureServiceStore
            .getState()
            .applyModifiedTextureToMesh(get().getMeshById(id));
        }
      }
    },

    _removeCommitComparisonVisualization: (
      applicationData: ApplicationData
    ) => {
      const packages = getAllPackagesInApplication(applicationData.application);
      const classes = getAllClassesInApplication(applicationData.application);
      packages.forEach((pckg) => {
        const mesh = get().getBoxMeshByModelId(pckg.id);
        if (
          mesh &&
          (mesh.material instanceof THREE.MeshBasicMaterial ||
            mesh.material instanceof THREE.MeshLambertMaterial ||
            mesh.material instanceof MeshLineMaterial)
        ) {
          mesh.material.map = null;
        }
      });
      classes.forEach((clazz) => {
        const mesh = get().getBoxMeshByModelId(clazz.id);
        if (
          mesh &&
          (mesh.material instanceof THREE.MeshBasicMaterial ||
            mesh.material instanceof THREE.MeshLambertMaterial ||
            mesh.material instanceof MeshLineMaterial)
        ) {
          mesh.material.map = null;
        }
      });
    },

    cleanup: () => {
      get().forEachOpenApplication(get().removeApplicationLocally);
      let newOpenApplicationsMap = new Map(get().openApplicationsMap);
      newOpenApplicationsMap.clear();
      set({ openApplicationsMap: newOpenApplicationsMap });
    },
  })
);
