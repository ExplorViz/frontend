import { inject as service } from '@ember/service';
import { all } from 'ember-concurrency';
import { restartableTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import ApplicationRepository, { ApplicationData } from 'explorviz-frontend/services/repos/application-repository';
import computeDrawableClassCommunication from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import calculateCommunications from 'explorviz-frontend/utils/calculate-communications';
import calculateHeatmap from 'explorviz-frontend/utils/calculate-heatmap';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';

interface NamedArgs {
    readonly landscapeData: LandscapeData,
}

interface Args {
    positional: [],
    named: NamedArgs,
}

export default class LandscapeDataWatcherModifier extends Modifier<Args> {

    debug = debugLogger('ApplicationRendererModifier');

    @service('repos/application-repository')
    private applicationRepo!: ApplicationRepository;

    @service('application-renderer')
    applicationRenderer!: ApplicationRenderer

    @service('landscape-renderer')
    private landscapeRenderer!: LandscapeRenderer;

    @service('configuration')
    configuration!: Configuration;

    @service()
    private worker!: any;

    private landscapeData!: LandscapeData;

    @service('vr-room-serializer')
    roomSerializer!: VrRoomSerializer;

    didSetup = false;

    get structureLandscapeData() {
        return this.landscapeData.structureLandscapeData;
    }

    get dynamicLandscapeData() {
        return this.landscapeData.dynamicLandscapeData;
    }

    modify(_element: any, [], { landscapeData }: NamedArgs) {
        this.landscapeData = landscapeData;

        if (!this.didSetup) {
            this.didSetup = true;
        }

        perform(this.handleUpdatedLandscapeData);
    }

    @restartableTask *
        handleUpdatedLandscapeData() {
        yield Promise.resolve();

        const drawableClassCommunications = computeDrawableClassCommunication(
            this.structureLandscapeData,
            this.dynamicLandscapeData,
        );

        // Use the updated landscape data to calculate application metrics.
        // This is done for all applications to have accurate heatmap data.
        for (const node of this.structureLandscapeData.nodes) {
            for (const application of node.applications) {
                const workerPayload = {
                    structure: application,
                    dynamic: this.dynamicLandscapeData,
                };
                const cityLayout = this.worker.postMessage('city-layouter', workerPayload);
                const heatmapMetrics = this.worker.postMessage('metrics-worker', workerPayload);
                const results = (yield all([cityLayout, heatmapMetrics])) as any[];
                let applicationData = this.applicationRepo.getById(application.id);
                if (applicationData) {
                    applicationData.updateApplication(application, results[0]);
                } else {
                    applicationData = new ApplicationData(application, results[0]);
                }
                applicationData.drawableClassCommunications = calculateCommunications(applicationData.application, drawableClassCommunications);
                calculateHeatmap(applicationData.heatmapData, results[1]);
                this.applicationRepo.add(applicationData);
            }
        }

        const serializedRoom = this.roomSerializer.serializedRoom;
        perform(this.landscapeRenderer.populateLandscape, this.structureLandscapeData, this.dynamicLandscapeData);
        if (serializedRoom) {
            this.landscapeRenderer.restore(serializedRoom.landscape)
            this.applicationRenderer.restore(serializedRoom);
            this.roomSerializer.serializedRoom = undefined;
            // TODO restore detached menus
            // Initialize detached menus.
            // detachedMenus.forEach((detachedMenu) => {
            //   const object = this.sceneService.findMeshByModelId(
            //     detachedMenu.entityType,
            //     detachedMenu.entityId,
            //   );
            //   if (isEntityMesh(object)) {
            //     const menu = this.menuFactory.buildInfoMenu(object);
            //     menu.position.fromArray(detachedMenu.position);
            //     menu.quaternion.fromArray(detachedMenu.quaternion);
            //     menu.scale.fromArray(detachedMenu.scale);
            //     this.detachedMenuGroups.addDetachedMenuLocally(
            //       menu,
            //       detachedMenu.objectId,
            //     );
            //   }
            // });
        } else {
            for (const applicationId of this.applicationRenderer.openApplicationIds) {
                const applicationData = this.applicationRepo.getById(applicationId);
                if (applicationData) {
                    perform(
                        this.applicationRenderer.addApplicationTask,
                        applicationData,
                    );
                } else {
                    this.applicationRenderer.removeApplicationLocally(applicationId);
                }
            }
        }
    }
}
