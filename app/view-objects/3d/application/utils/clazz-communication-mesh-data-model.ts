import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

// TODO might need to refactor as simple type

export default class ClazzCommuMeshDataModel {
  drawableClassCommus: DrawableClassCommunication[];

  bidirectional: boolean;

  id: string;

  application: Application;

  targetApplication?: Application;

  constructor(
    application: Application,
    drawableClassCommus: DrawableClassCommunication[],
    bidirectional: boolean,
    id: string
  ) {
    this.application = application;
    this.drawableClassCommus = drawableClassCommus;
    this.bidirectional = bidirectional;

    this.id = id;
  }
}
