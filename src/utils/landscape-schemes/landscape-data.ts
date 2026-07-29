import { CommSummary } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export interface LandscapeData {
  structureLandscapeData?: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
  aggregatedFileCommunication: CommSummary;
  flatLandscapeData: FlatLandscape;
}
