import { Application, BaseModel } from '../landscape-schemes/structure-data';

export type FlatData = {
  hashCodeClassMap: Map<string, any>;
  packageNameModelMap: Map<string, any>;
  fqnToModelMap: Map<string, FlatDataModelBasicInfo>;
};

export type FlatDataModelBasicInfo = {
  applicationName: string;
  applicationModelId: string;
  applicationModel: Application;
  fqn: string;
  modelId: string;
  model: BaseModel;
};
