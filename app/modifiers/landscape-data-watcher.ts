import { inject as service } from '@ember/service';
import { restartableTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import ApplicationRenderer, { LayoutData } from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import computeDrawableClassCommunication from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';

interface NamedArgs {
    initCallback?(applicationObject3D: ApplicationObject3D): void,
    openApplications: Map<string, Application>,
    readonly landscapeData: LandscapeData,
}

interface Args {
    positional: [],
    named: NamedArgs,
}

export default class LandscapeDataWatcherModifier extends Modifier<Args> {

    debug = debugLogger('ApplicationRendererModifier');

    @service()
    private worker!: any;

    @service('application-renderer')
    applicationRenderer!: ApplicationRenderer

    @service('landscape-renderer')
    private landscapeRenderer!: LandscapeRenderer;

    @service('configuration')
    configuration!: Configuration;

    didSetup = false;

    private landscapeData!: LandscapeData;

    private initCallback?(applicationObject3D: ApplicationObject3D): void;

    private openApplications: Map<string, Application> = new Map<string, Application>();

    private lastOpenApplicationIds: string[] = [];

    @service('heatmap-configuration')
    heatmapConf!: HeatmapConfiguration;

    get structureLandscapeData() {
        return this.landscapeData.structureLandscapeData;
    }

    get dynamicLandscapeData() {
        return this.landscapeData.dynamicLandscapeData;
    }

    modify(_element: any, [], { initCallback, openApplications, landscapeData }: NamedArgs) {
        this.landscapeData = landscapeData;
        this.initCallback = initCallback;
        this.openApplications = openApplications;

        if (!this.didSetup) {
            this.didSetup = true;
        }

        perform(this.handleUpdatedLandscapeData);
    }

    @restartableTask *
        handleUpdatedLandscapeData() {
        yield Promise.resolve();

        perform(this.landscapeRenderer.populateLandscape, this.structureLandscapeData, this.dynamicLandscapeData);

        const drawableClassCommunications = computeDrawableClassCommunication(
            this.structureLandscapeData,
            this.dynamicLandscapeData,
        );

        // render applications
        for (const application of this.openApplications.values()) {
            const isOpen = this.applicationRenderer.isApplicationOpen(application.id);

            const workerPayload = {
                structure: application,
                dynamic: this.dynamicLandscapeData,
            };

            const layoutMap: Map<string, LayoutData> = yield this.worker.postMessage('city-layouter', workerPayload);

            const applicationObject3D = yield perform(
                this.applicationRenderer.addApplicationTask,
                application,
                layoutMap,
                this.dynamicLandscapeData,
                drawableClassCommunications,
            );
            perform(this.heatmapConf.calculateHeatmap, applicationObject3D);
            if (this.initCallback && !isOpen) this.initCallback(applicationObject3D);
        }

        // remove closed applications
        for (const applicationId of this.lastOpenApplicationIds) {
            if (!this.openApplications.has(applicationId)) {
                this.applicationRenderer.removeApplicationLocally(applicationId);
            }
        }
        this.lastOpenApplicationIds = [...this.openApplications.keys()];
    }
}
