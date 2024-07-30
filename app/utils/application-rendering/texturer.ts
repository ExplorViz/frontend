import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';

export default class Texturer {
  markAsAddedById(mesh: any) {
    if (isEntityMesh(mesh)) {
      this.markAsAdded(mesh);
    }
  }

  markAsDeletedById(mesh: any) {
    if (isEntityMesh(mesh)) {
      this.markAsDeleted(mesh);
    }
  }

  markAsModifiedById(mesh: any) {
    if (isEntityMesh(mesh)) {
      this.markAsModified(mesh);
    }
  }

  private markAsAdded(mesh: EntityMesh) {
    if (mesh instanceof ClazzCommunicationMesh) {
      const start = mesh.layout.startPoint;
      const end = mesh.layout.endPoint;
      const dist = start.distanceTo(end);
      //mesh.wasModified = true;
      (mesh as EntityMesh).changeTexture(
        '../images/plus.png',
        Math.ceil(dist),
        3
      );
    } else {
      //mesh.wasModified = true;
      mesh.changeTexture('../images/plus.png');
    }
  }

  private markAsDeleted(mesh: EntityMesh) {
    if (mesh instanceof ClazzCommunicationMesh) {
      const start = mesh.layout.startPoint;
      const end = mesh.layout.endPoint;
      const dist = start.distanceTo(end);
      //mesh.wasModified = true;
      (mesh as EntityMesh).changeTexture(
        '../images/minus.png',
        Math.ceil(dist),
        3
      );
    } else {
      //mesh.wasModified = true;
      mesh.changeTexture('../images/minus.png');
    }
  }

  private markAsModified(mesh: EntityMesh) {
    if (mesh instanceof ClazzCommunicationMesh) {
      const start = mesh.layout.startPoint;
      const end = mesh.layout.endPoint;
      const dist = start.distanceTo(end);
      //mesh.wasModified = true;
      (mesh as EntityMesh).changeTexture(
        '../images/hashtag.png',
        Math.ceil(dist),
        3
      );
    } else {
      //mesh.wasModified = true;
      mesh.changeTexture('../images/hashtag.png');
    }
  }
}
