import Service, { inject as service } from '@ember/service';
import ApplicationRenderer from './application-renderer';
import { EvolutionModeRenderingConfiguration } from './rendering-service';
import {
  StructureLandscapeData,
  TypeOfAnalysis,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import LinkRenderer from './link-renderer';

export default class VisibilityService extends Service {
  //#region Services

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('link-renderer')
  private linkRenderer!: LinkRenderer;

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
    return this._evolutionModeRenderingConfiguration;
  }
  //#endregion

  //#region Utility

  updateStaticAndDynamicLandscapeStructureVisibility(
    newEvolutionModeRenderingConfiguration: EvolutionModeRenderingConfiguration
  ) {
    const { renderDynamic, renderStatic, renderOnlyDifferences } =
      this.getCloneOfEvolutionModeRenderingConfiguration();

    //staticAndDynamicStructureLandscapeData: StructureLandscapeData

    const needToChangeDynamic =
      renderDynamic != this._evolutionModeRenderingConfiguration.renderDynamic;
    const needToChangeStatic =
      renderStatic != this._evolutionModeRenderingConfiguration.renderStatic;
    const needToChangeDifferenceRendering =
      renderOnlyDifferences !=
      this._evolutionModeRenderingConfiguration.renderOnlyDifferences;

    for (const applicationObject3D of this.applicationRenderer
      .openApplications) {
    }

    this._evolutionModeRenderingConfiguration =
      newEvolutionModeRenderingConfiguration;
  }

  //#endregion

  //#region Private Func.

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'visibility-service': VisibilityService;
  }
}
