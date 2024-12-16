import Component from '@glimmer/component';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { action } from '@ember/object';
import {
  Class,
  Package,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import { tracked } from '@glimmer/tracking';
import { getAllClassesInApplication } from 'react-lib/src/utils/application-helpers';
import { inject as service } from '@ember/service';
import TimestampService, {
  NEW_SELECTED_TIMESTAMP_EVENT,
} from 'explorviz-frontend/services/timestamp';

interface Args {
  readonly landscapeData: LandscapeData;
  triggerRenderingForGivenLandscapeData(
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

  @tracked
  initialClasses: Class[] = [];

  @tracked
  numRemainingClassesAfterFilteredByMethodCount = 0;

  private initialLandscapeData!: LandscapeData;
  private selectedMinMethodCount: number = 0;

  constructor(owner: any, args: Args) {
    super(owner, args);

    this.resetState();

    this.timestampService.on(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.resetState
    );
  }

  //#region JS getters

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

  //#endregion JS getters

  //#region template actions

  @action
  updateMinMethodCount(newMinMethodCount: number) {
    this.selectedMinMethodCount = newMinMethodCount;
    this.triggerRenderingForGivenLandscapeData();
  }

  //#endregion template actions

  private resetState() {
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

  private triggerRenderingForGivenLandscapeData() {
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

    this.args.triggerRenderingForGivenLandscapeData(
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
    this.args.triggerRenderingForGivenLandscapeData(
      this.initialLandscapeData.structureLandscapeData,
      this.initialLandscapeData.dynamicLandscapeData
    );
    this.timestampService.off(
      NEW_SELECTED_TIMESTAMP_EVENT,
      this,
      this.resetState
    );
  }
}
