import { StructureLandscapeData } from './structure-data';
import { DynamicLandscapeData } from './dynamic/dynamic-data';

export interface LandscapeData {
  structureLandscapeData: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
}
