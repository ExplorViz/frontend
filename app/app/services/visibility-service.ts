import Service, { inject as service } from '@ember/service';
import ApplicationRenderer from './application-renderer';
import RenderingService, {
  EvolutionModeRenderingConfiguration,
} from './rendering-service';
import {
  Class,
  Package,
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import LinkRenderer from './link-renderer';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';

export default class VisibilityService extends Service {
  //#region Services

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

  @service('rendering-service')
  private renderingService!: RenderingService;

  //#endregion

  //#region Fields

  private _evolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration =
    {
      renderDynamic: true,
      renderStatic: true,
      renderOnlyDifferences: false,
    };

  //#endregion

  //#region Get / Set

  getCloneOfEvolutionModeRenderingConfiguration() {
    // return clone so that we don't unintentionally alter the object via
    // the getter
    return structuredClone(this._evolutionModeRenderingConfiguration);
  }
  //#endregion

  //#region Utility

  applyEvolutionModeRenderingConfiguration(
    newEvolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration
  ) {
    const { renderDynamic, renderStatic, renderOnlyDifferences } =
      newEvolutionModeRenderingConfiguration;

    const needToChangeDynamic =
      renderDynamic != this._evolutionModeRenderingConfiguration.renderDynamic;
    const needToChangeStatic =
      renderStatic != this._evolutionModeRenderingConfiguration.renderStatic;
    const needToChangeDifferenceRendering =
      renderOnlyDifferences !=
      this._evolutionModeRenderingConfiguration.renderOnlyDifferences;

    const staticAndDynamicStructureLandscapeData:
      | StructureLandscapeData
      | undefined = this.renderingService.landscapeData?.structureLandscapeData;

    for (const applicationObject3D of this.applicationRenderer
      .openApplications) {
      const hideVis = (
        type: TypeOfAnalysis,
        keepMeshesNecessaryForDifference: boolean = false
      ) =>
        this.hideVisualization(
          applicationObject3D,
          staticAndDynamicStructureLandscapeData,
          type,
          keepMeshesNecessaryForDifference
        );
      const showVis = (type: TypeOfAnalysis, showCommLines: boolean) =>
        this.showVisualization(
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

    this._evolutionModeRenderingConfiguration =
      newEvolutionModeRenderingConfiguration;
  }

  //#endregion

  //#region Private Func.

  private isMeshRelevantForDifference(mesh: BaseMesh): boolean {
    return mesh.texturePath != null;
  }

  private showVisualization(
    applicationObject3D: ApplicationObject3D,
    structure: StructureLandscapeData | undefined,
    dataTypeToShow: TypeOfAnalysis,
    showCommLines: boolean,
    showOnlyMeshesNecessaryForDifference: boolean
  ) {
    structure?.nodes.forEach((node) => {
      const app = node.applications.find(
        (a) => a.id === applicationObject3D.data.application.id
      );

      if (app) {
        app.packages.forEach((pckg) =>
          this.showPackageAndAllSubComponents(
            applicationObject3D,
            pckg,
            dataTypeToShow,
            showOnlyMeshesNecessaryForDifference
          )
        );
        if (showCommLines) {
          // show communication links
          this.linkRenderer.getAllLinks().forEach((externPipe) => {
            if (
              showOnlyMeshesNecessaryForDifference &&
              this.isMeshRelevantForDifference(externPipe)
            ) {
              externPipe.show();
            } else {
              externPipe.show();
            }
          });
          applicationObject3D.getCommMeshes().forEach((commMesh) => {
            if (
              showOnlyMeshesNecessaryForDifference &&
              this.isMeshRelevantForDifference(commMesh)
            ) {
              commMesh.show();
            } else {
              commMesh.show();
            }
          });
        }
      }
    });
  }

  private showPackageAndAllSubComponents(
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToShow: TypeOfAnalysis,
    showOnlyMeshesNecessaryForDifference: boolean
  ) {
    pckg.classes.forEach((clazz) =>
      this.showClass(
        applicationObject3D,
        clazz,
        dataTypeToShow,
        showOnlyMeshesNecessaryForDifference
      )
    );
    pckg.subPackages.forEach((subPckg) =>
      this.showPackageAndAllSubComponents(
        applicationObject3D,
        subPckg,
        dataTypeToShow,
        showOnlyMeshesNecessaryForDifference
      )
    );
    this.showPackage(
      applicationObject3D,
      pckg,
      dataTypeToShow,
      showOnlyMeshesNecessaryForDifference
    );
  }

  private showClass(
    applicationObject3D: ApplicationObject3D,
    clss: Class,
    dataTypeToShow: TypeOfAnalysis,
    showOnlyMeshesNecessaryForDifference: boolean
  ) {
    const clazzMesh = applicationObject3D.getMeshById(clss.id);
    if (dataTypeToShow === clss.originOfData && clazzMesh) {
      if (
        showOnlyMeshesNecessaryForDifference &&
        this.isMeshRelevantForDifference(clazzMesh)
      ) {
        clazzMesh.show();
      } else if (!showOnlyMeshesNecessaryForDifference) {
        clazzMesh.show();
      }
    }
  }

  private showPackage(
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToShow: TypeOfAnalysis,
    showOnlyMeshesNecessaryForDifference: boolean
  ) {
    const packageMesh = applicationObject3D.getMeshById(pckg.id);
    if (dataTypeToShow === pckg.originOfData && packageMesh) {
      if (
        showOnlyMeshesNecessaryForDifference &&
        this.isMeshRelevantForDifference(packageMesh)
      ) {
        packageMesh.show();
      } else if (!showOnlyMeshesNecessaryForDifference) {
        packageMesh.show();
      }
    }
  }

  private hideVisualization(
    applicationObject3D: ApplicationObject3D,
    structure: StructureLandscapeData | undefined,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) {
    structure?.nodes.forEach((node) => {
      const app = node.applications.find(
        (a) => a.id === applicationObject3D.data.application.id
      );

      if (app) {
        app.packages.forEach((pckg) =>
          this.hidePackageAndAllSubComponents(
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
          this.linkRenderer
            .getAllLinks()
            .forEach((externPipe) => externPipe.hide());
          applicationObject3D
            .getCommMeshes()
            .forEach((commMesh) => commMesh.hide());
        }
      }
    });
  }

  private hidePackageAndAllSubComponents(
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) {
    pckg.classes.forEach((clazz) =>
      this.hideClass(
        applicationObject3D,
        clazz,
        dataTypeToHide,
        keepMeshesNecessaryForDifference
      )
    );
    pckg.subPackages.forEach((subPckg) =>
      this.hidePackageAndAllSubComponents(
        applicationObject3D,
        subPckg,
        dataTypeToHide,
        keepMeshesNecessaryForDifference
      )
    );
    this.hidePackage(
      applicationObject3D,
      pckg,
      dataTypeToHide,
      keepMeshesNecessaryForDifference
    );
  }

  private hideClass(
    applicationObject3D: ApplicationObject3D,
    clss: Class,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) {
    const clazzMesh = applicationObject3D.getMeshById(clss.id);
    if (
      dataTypeToHide === clss.originOfData &&
      clazzMesh &&
      (!keepMeshesNecessaryForDifference ||
        (keepMeshesNecessaryForDifference &&
          !this.isMeshRelevantForDifference(clazzMesh)))
    ) {
      clazzMesh.hide();
    }
  }

  private hidePackage(
    applicationObject3D: ApplicationObject3D,
    pckg: Package,
    dataTypeToHide: TypeOfAnalysis,
    keepMeshesNecessaryForDifference: boolean
  ) {
    const packageMesh = applicationObject3D.getMeshById(pckg.id);
    if (
      dataTypeToHide === pckg.originOfData &&
      packageMesh &&
      (!keepMeshesNecessaryForDifference ||
        (keepMeshesNecessaryForDifference &&
          !this.isMeshRelevantForDifference(packageMesh)))
    ) {
      packageMesh.hide();
    }
  }

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'visibility-service': VisibilityService;
  }
}
