import { Application } from 'react-lib/src/utils/landscape-schemes/structure-data';

export interface ApplicationCommunication {
  id: string;
  sourceApplication: Application;
  targetApplication: Application;
}
