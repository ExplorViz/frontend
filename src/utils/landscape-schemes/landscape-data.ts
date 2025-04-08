import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';

export interface LandscapeData {
  structureLandscapeData: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
}
