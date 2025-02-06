import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'react-lib/src/view-objects/layout-models/box-layout';

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
