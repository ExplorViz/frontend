import { inject as service } from '@ember/service';
import { restartableTask } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
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
        for (const application of this.openApplications.values()) {
            const isOpen = this.applicationRenderer.isApplicationOpen(application.id);

            const applicationObject3D = yield perform(
                this.applicationRenderer.addApplicationTask,
                application,
                this.dynamicLandscapeData,
                drawableClassCommunications,
            );
            perform(this.heatmapConf.calculateHeatmapTask, applicationObject3D);
            if (this.initCallback && !isOpen) this.initCallback(applicationObject3D);
        }
    }
}
