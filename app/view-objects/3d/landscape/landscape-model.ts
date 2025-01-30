import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';

export default class LandscapeModel {
  id = 'landscape';
  traces: DynamicLandscapeData;
  structure: StructureLandscapeData;

  boxLayout: BoxLayout;

  constructor(
    structure: StructureLandscapeData,
    traces: DynamicLandscapeData,
    boxLayout: BoxLayout
  ) {
    this.structure = structure;
    this.traces = traces;
    this.boxLayout = boxLayout;
  }
}
