import Service from '@ember/service';
import { APPLICATION_ENTITY_TYPE, CLASS_COMMUNICATION_ENTITY_TYPE, CLASS_ENTITY_TYPE, COMPONENT_ENTITY_TYPE, EntityType, NODE_ENTITY_TYPE } from 'virtual-reality/utils/vr-message/util/entity_type';

export default class MeshService extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  // TODO can probably be moved to the application renderer once the landscape view is gone
  findMeshByModelId(entityType: EntityType, id: string) {
    switch (entityType) {
      case NODE_ENTITY_TYPE:
      case APPLICATION_ENTITY_TYPE:
        return this.landscapeRenderer.landscapeObject3D.getMeshbyModelId(id);

      case COMPONENT_ENTITY_TYPE:
      case CLASS_ENTITY_TYPE:
        return this.applicationRenderer.getBoxMeshByModelId(id);

      case CLASS_COMMUNICATION_ENTITY_TYPE:
        return this.applicationRenderer.getCommunicationMeshById(id);

      default:
        return null;
    }
  }

  // normal class body definition here
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'mesh-service': MeshService;
  }
}
