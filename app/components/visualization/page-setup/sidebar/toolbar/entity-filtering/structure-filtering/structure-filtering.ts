import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import {
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { tracked } from '@glimmer/tracking';
import { getAllClassesInApplication } from 'explorviz-frontend/utils/application-helpers';
import { inject as service } from '@ember/service';
import TimestampService, {
  NEW_SELECTED_TIMESTAMP_EVENT,
} from 'explorviz-frontend/services/timestamp';

interface Args {
  readonly landscapeData: LandscapeData;
  updateLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  pauseVisualizationUpdating(): void;
}

export default class StructureFiltering extends Component<Args> {
  @service('timestamp')
  timestampService!: TimestampService;

  @tracked
  classes: Class[] = [];

  private initialLandscapeData: LandscapeData;

  @tracked
  private initialClasses: Class[] = [];

  @tracked
  numRemainingClassesAfterFilteredByMethodCount = this.initialClasses.length;

  private selectedMinMethodCount: number = 0;

  constructor(owner: any, args: Args) {
    super(owner, args);

    let classes: Class[] = [];

    for (const node of this.args.landscapeData.structureLandscapeData.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }
    this.initialClasses = classes;

    this.initialLandscapeData = this.args.landscapeData;

    this.timestampService.on(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.onTimestampUpdate
    );
  }

  private onTimestampUpdate() {
    console.log('test');
    // reset state, since new timestamp has been loaded
    let classes: Class[] = [];

    for (const node of this.args.landscapeData.structureLandscapeData.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }
    this.initialClasses = classes;

    this.initialLandscapeData = this.args.landscapeData;

    this.numRemainingClassesAfterFilteredByMethodCount =
      this.initialClasses.length;
  }

  get initialClassCount() {
    return this.initialClasses.length;
  }

  get classCount() {
    let classes: Class[] = [];

    for (const node of this.args.landscapeData.structureLandscapeData.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }
    this.classes = classes;
    return classes.length;
  }

  @action
  updateMinMethodCount(newMinMethodCount: number) {
    this.selectedMinMethodCount = newMinMethodCount;
    this.updateLandscape();
  }

  private updateLandscape() {
    let numFilter = 0;

    // hide all classes that have a strict lower method count than selected
    const classesToRemove = this.initialClasses.filter((t) => {
      if (t.methods.length < this.selectedMinMethodCount!) {
        return true;
      }
      numFilter++;
      return false;
    });

    this.numRemainingClassesAfterFilteredByMethodCount = numFilter;
    numFilter = 0;

    const deepCopyStructure = structuredClone(
      this.initialLandscapeData.structureLandscapeData
    );

    let classes: Class[] = [];

    for (const node of deepCopyStructure.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }

    classes = [];

    for (const node of deepCopyStructure.nodes) {
      for (const app of node.applications) {
        for (const pack of app.packages) {
          this.removeFilteredClassesOfNestedPackages(pack, classesToRemove);
        }
      }
    }

    for (const node of deepCopyStructure.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }

    classes = [];

    this.args.updateLandscape(
      deepCopyStructure,
      this.args.landscapeData.dynamicLandscapeData
    );
  }

  private removeFilteredClassesOfNestedPackages(
    pack: Package,
    classesToRemove: Class[]
  ) {
    if (classesToRemove.length == 0) {
      return;
    }

    for (let i = pack.classes.length - 1; i >= 0; i--) {
      if (classesToRemove.find((clazz) => clazz.id == pack.classes[i].id)) {
        pack.classes.splice(i, 1);
      }
    }

    for (const subPack of pack.subPackages) {
      this.removeFilteredClassesOfNestedPackages(subPack, classesToRemove);
    }
  }

  willDestroy(): void {
    this.args.updateLandscape(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
    this.timestampService.off(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.onTimestampUpdate
    );
  }
}
