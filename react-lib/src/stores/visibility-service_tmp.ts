import { create } from 'zustand';
import { useApplicationRendererStore } from './application-renderer';
import {
  useRenderingServiceStore,
  EvolutionModeRenderingConfiguration,
} from 'react-lib/src/stores/rendering-service';
import {
  Class,
  Package,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import { useLinkRendererStore } from 'react-lib/src/stores/link-renderer';
import BaseMesh from 'react-lib/src/view-objects/3d/base-mesh.ts';

interface VisibilityServiceState {
  _evolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration;
  getCloneOfEvolutionModeRenderingConfiguration: () => EvolutionModeRenderingConfiguration;
  applyEvolutionModeRenderingConfiguration: (
    newEvolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration
  ) => void;
  _isMeshRelevantForDifference: (mesh: BaseMesh) => boolean;
  _showVisualization: (
    applicationObject3D: ApplicationObject3D,
    structure: StructureLandscapeData | undefined,
    dataTypeToShow: TypeOfAnalysis,
    showCommLines: boolean,
    showOnlyMeshesNecessaryForDifference: boolean
  ) => void;
  _showPackageAndAllSubComponents: (
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToShow: TypeOfAnalysis,
    showOnlyMeshesNecessaryForDifference: boolean
  ) => void;
  _showClass: (
    applicationObject3D: ApplicationObject3D,
    clss: Class,
    dataTypeToShow: TypeOfAnalysis,
    showOnlyMeshesNecessaryForDifference: boolean
  ) => void;
  _showPackage: (
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToShow: TypeOfAnalysis,
    showOnlyMeshesNecessaryForDifference: boolean
  ) => void;
  _hideVisualization: (
    applicationObject3D: ApplicationObject3D,
    structure: StructureLandscapeData | undefined,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) => void;
  _hidePackageAndAllSubComponents: (
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) => void;
  _hideClass: (
    applicationObject3D: ApplicationObject3D,
    clss: Class,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) => void;
  _hidePackage: (
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) => void;
}

export const useVisibilityServiceStore = create<VisibilityServiceState>(
  (set, get) => ({
    _evolutionModeRenderingConfiguration: {
      renderDynamic: true,
      renderStatic: true,
      renderOnlyDifferences: false,
    },

    getCloneOfEvolutionModeRenderingConfiguration: () => {
      // return clone so that we don't unintentionally alter the object via
      // the getter
      return structuredClone(get()._evolutionModeRenderingConfiguration);
    },

    applyEvolutionModeRenderingConfiguration: (
      newEvolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration
    ) => {
      const { renderDynamic, renderStatic, renderOnlyDifferences } =
        newEvolutionModeRenderingConfiguration;

      const needToChangeDynamic =
        renderDynamic !=
        get()._evolutionModeRenderingConfiguration.renderDynamic;
      const needToChangeStatic =
        renderStatic != get()._evolutionModeRenderingConfiguration.renderStatic;
      const needToChangeDifferenceRendering =
        renderOnlyDifferences !=
        get()._evolutionModeRenderingConfiguration.renderOnlyDifferences;

      const staticAndDynamicStructureLandscapeData:
        | StructureLandscapeData
        | undefined =
        useRenderingServiceStore.getState()._landscapeData
          ?.structureLandscapeData;

      for (const applicationObject3D of useApplicationRendererStore.getState()
        .openApplications) {
        const hideVis = (
          type: TypeOfAnalysis,
          keepMeshesNecessaryForDifference: boolean = false
        ) =>
          get()._hideVisualization(
            applicationObject3D,
            staticAndDynamicStructureLandscapeData,
            type,
            keepMeshesNecessaryForDifference
          );
        const showVis = (type: TypeOfAnalysis, showCommLines: boolean) =>
          get()._showVisualization(
            applicationObject3D,
            staticAndDynamicStructureLandscapeData,
            type,
            showCommLines,
            renderOnlyDifferences
          );

        if (!renderDynamic && !renderStatic) {
          hideVis(TypeOfAnalysis.StaticAndDynamic);
          hideVis(TypeOfAnalysis.Static);
          hideVis(TypeOfAnalysis.Dynamic);
          return;
        }

        if (needToChangeDynamic) {
          if (renderDynamic) {
            showVis(TypeOfAnalysis.StaticAndDynamic, true);
            showVis(TypeOfAnalysis.Dynamic, true);
          } else {
            hideVis(TypeOfAnalysis.Dynamic);
          }
        }

        if (needToChangeStatic) {
          if (renderStatic) {
            showVis(TypeOfAnalysis.StaticAndDynamic, renderDynamic);
            showVis(TypeOfAnalysis.Static, renderDynamic);
          } else {
            hideVis(TypeOfAnalysis.Static);
          }
        }

        if (needToChangeDifferenceRendering) {
          if (renderOnlyDifferences) {
            if (renderDynamic && renderStatic)
              hideVis(TypeOfAnalysis.StaticAndDynamic, true);
            if (renderDynamic) hideVis(TypeOfAnalysis.Dynamic, true);
            if (renderStatic) hideVis(TypeOfAnalysis.Static, true);
          } else {
            if (renderDynamic && renderStatic)
              showVis(TypeOfAnalysis.StaticAndDynamic, renderDynamic);
            if (renderDynamic) showVis(TypeOfAnalysis.Dynamic, true);
            if (renderStatic) showVis(TypeOfAnalysis.Static, renderDynamic);
          }
        }
      }

      set({
        _evolutionModeRenderingConfiguration:
          newEvolutionModeRenderingConfiguration,
      });
    },

    // private
    _isMeshRelevantForDifference: (mesh: BaseMesh): boolean => {
      return mesh.texturePath != null;
    },

    // private
    _showVisualization: (
      applicationObject3D: ApplicationObject3D,
      structure: StructureLandscapeData | undefined,
      dataTypeToShow: TypeOfAnalysis,
      showCommLines: boolean,
      showOnlyMeshesNecessaryForDifference: boolean
    ) => {
      structure?.nodes.forEach((node) => {
        const app = node.applications.find(
          (a) => a.id === applicationObject3D.data.application.id
        );

        if (app) {
          app.packages.forEach((pckg) =>
            get()._showPackageAndAllSubComponents(
              applicationObject3D,
              pckg,
              dataTypeToShow,
              showOnlyMeshesNecessaryForDifference
            )
          );
          if (showCommLines) {
            // show communication links
            useLinkRendererStore
              .getState()
              .getAllLinks()
              .forEach((externPipe) => {
                if (
                  showOnlyMeshesNecessaryForDifference &&
                  get()._isMeshRelevantForDifference(externPipe)
                ) {
                  externPipe.show();
                } else {
                  externPipe.show();
                }
              });
            applicationObject3D.getCommMeshes().forEach((commMesh) => {
              if (
                showOnlyMeshesNecessaryForDifference &&
                get()._isMeshRelevantForDifference(commMesh)
              ) {
                commMesh.show();
              } else {
                commMesh.show();
              }
            });
          }
        }
      });
    },

    // private
    _showPackageAndAllSubComponents: (
      applicationObject3D: ApplicationObject3D,
      pckg: Package,
      dataTypeToShow: TypeOfAnalysis,
      showOnlyMeshesNecessaryForDifference: boolean
    ) => {
      pckg.classes.forEach((clazz) =>
        get()._showClass(
          applicationObject3D,
          clazz,
          dataTypeToShow,
          showOnlyMeshesNecessaryForDifference
        )
      );
      pckg.subPackages.forEach((subPckg) =>
        get()._showPackageAndAllSubComponents(
          applicationObject3D,
          subPckg,
          dataTypeToShow,
          showOnlyMeshesNecessaryForDifference
        )
      );
      get()._showPackage(
        applicationObject3D,
        pckg,
        dataTypeToShow,
        showOnlyMeshesNecessaryForDifference
      );
    },

    // private
    _showClass: (
      applicationObject3D: ApplicationObject3D,
      clss: Class,
      dataTypeToShow: TypeOfAnalysis,
      showOnlyMeshesNecessaryForDifference: boolean
    ) => {
      const clazzMesh = applicationObject3D.getMeshById(clss.id);
      if (dataTypeToShow === clss.originOfData && clazzMesh) {
        if (
          showOnlyMeshesNecessaryForDifference &&
          get()._isMeshRelevantForDifference(clazzMesh)
        ) {
          clazzMesh.show();
        } else if (!showOnlyMeshesNecessaryForDifference) {
          clazzMesh.show();
        }
      }
    },

    // private
    _showPackage: (
      applicationObject3D: ApplicationObject3D,
      pckg: Package,
      dataTypeToShow: TypeOfAnalysis,
      showOnlyMeshesNecessaryForDifference: boolean
    ) => {
      const packageMesh = applicationObject3D.getMeshById(pckg.id);
      if (dataTypeToShow === pckg.originOfData && packageMesh) {
        if (
          showOnlyMeshesNecessaryForDifference &&
          get()._isMeshRelevantForDifference(packageMesh)
        ) {
          packageMesh.show();
        } else if (!showOnlyMeshesNecessaryForDifference) {
          packageMesh.show();
        }
      }
    },

    // private
    _hideVisualization: (
      applicationObject3D: ApplicationObject3D,
      structure: StructureLandscapeData | undefined,
      dataTypeToHide: TypeOfAnalysis,
      keepMeshesNecessaryForDifference: boolean
    ) => {
      structure?.nodes.forEach((node) => {
        const app = node.applications.find(
          (a) => a.id === applicationObject3D.data.application.id
        );

        if (app) {
          app.packages.forEach((pckg) =>
            get()._hidePackageAndAllSubComponents(
              applicationObject3D,
              pckg,
              dataTypeToHide,
              keepMeshesNecessaryForDifference
            )
          );
          if (
            dataTypeToHide === TypeOfAnalysis.Dynamic ||
            dataTypeToHide === TypeOfAnalysis.StaticAndDynamic
          ) {
            // hide communication links
            useLinkRendererStore
              .getState()
              .getAllLinks()
              .forEach((externPipe) => externPipe.hide());
            applicationObject3D
              .getCommMeshes()
              .forEach((commMesh) => commMesh.hide());
          }
        }
      });
    },

    // private
    _hidePackageAndAllSubComponents: (
      applicationObject3D: ApplicationObject3D,
      pckg: Package,
      dataTypeToHide: TypeOfAnalysis,
      keepMeshesNecessaryForDifference: boolean
    ) => {
      pckg.classes.forEach((clazz) =>
        get()._hideClass(
          applicationObject3D,
          clazz,
          dataTypeToHide,
          keepMeshesNecessaryForDifference
        )
      );
      pckg.subPackages.forEach((subPckg) =>
        get()._hidePackageAndAllSubComponents(
          applicationObject3D,
          subPckg,
          dataTypeToHide,
          keepMeshesNecessaryForDifference
        )
      );
      get()._hidePackage(
        applicationObject3D,
        pckg,
        dataTypeToHide,
        keepMeshesNecessaryForDifference
      );
    },

    // private
    _hideClass: (
      applicationObject3D: ApplicationObject3D,
      clss: Class,
      dataTypeToHide: TypeOfAnalysis,
      keepMeshesNecessaryForDifference: boolean
    ) => {
      const clazzMesh = applicationObject3D.getMeshById(clss.id);
      if (
        dataTypeToHide === clss.originOfData &&
        clazzMesh &&
        (!keepMeshesNecessaryForDifference ||
          (keepMeshesNecessaryForDifference &&
            !get()._isMeshRelevantForDifference(clazzMesh)))
      ) {
        clazzMesh.hide();
      }
    },

    // private
    _hidePackage: (
      applicationObject3D: ApplicationObject3D,
      pckg: Package,
      dataTypeToHide: TypeOfAnalysis,
      keepMeshesNecessaryForDifference: boolean
    ) => {
      const packageMesh = applicationObject3D.getMeshById(pckg.id);
      if (
        dataTypeToHide === pckg.originOfData &&
        packageMesh &&
        (!keepMeshesNecessaryForDifference ||
          (keepMeshesNecessaryForDifference &&
            !get()._isMeshRelevantForDifference(packageMesh)))
      ) {
        packageMesh.hide();
      }
    },
  })
);

// TODO private methods
