import { CommSummary } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';

import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export interface LandscapeData {
  structureLandscapeData?: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
  aggregatedFileCommunication: CommSummary;
  flatLandscapeData: FlatLandscape;
}
