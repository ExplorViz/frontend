import { AggregatedBuildingCommunication } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export interface LandscapeData {
  structureLandscapeData: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
  aggregatedFileCommunication: AggregatedBuildingCommunication;
  flatLandscapeData: FlatLandscape;
}
