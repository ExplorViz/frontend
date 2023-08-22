import { Application } from '../landscape-schemes/structure-data';

export interface ApplicationCommunication {
  id: string;
  sourceApplication: Application;
  targetApplication: Application;
}
