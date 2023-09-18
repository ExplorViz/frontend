import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import {
  isApplication,
  isClass,
  isPackage,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import UserSettings from 'explorviz-frontend/services/user-settings';

interface Args {
  entity: any;
  appId: string;
}

export default class EditMesh extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('user-settings')
  userSettings!: UserSettings;

  @tracked
  packageColor = this.userSettings.applicationSettings.componentOddColor.value;

  @tracked
  clazzColor = this.userSettings.applicationSettings.clazzColor.value;

  get isEntityApplication() {
    return isApplication(this.args.entity);
  }

  get isEntityPackage() {
    return isPackage(this.args.entity);
  }

  get isEntityClass() {
    return isClass(this.args.entity);
  }

  get isDeleted() {
    return !(
      (this.isEntityApplication &&
        this.landscapeRestructure.deletedDataModels.some(
          (entity) => entity === this.args.entity
        )) ||
      (this.isEntityPackage &&
        this.landscapeRestructure.deletedDataModels.some(
          (entity) => entity === this.args.entity
        )) ||
      (this.isEntityClass &&
        this.landscapeRestructure.deletedDataModels.some(
          (entity) => entity === this.args.entity
        ))
    );
  }

  get isInsertable(): boolean {
    if (!this.landscapeRestructure.clippedMesh) return false;

    const isClippedMeshPackage = isPackage(
      this.landscapeRestructure.clippedMesh
    );
    const isEntityApplicationOrPackage =
      isApplication(this.args.entity) || isPackage(this.args.entity);

    const isClippedMeshClass = isClass(this.landscapeRestructure.clippedMesh);
    const isEntityPackage = isPackage(this.args.entity);

    return (
      (isClippedMeshPackage && isEntityApplicationOrPackage) ||
      (isClippedMeshClass && isEntityPackage)
    );
  }

  @action
  addPackage() {
    if (this.isEntityApplication)
      this.landscapeRestructure.addPackage(this.args.entity);
    else if (this.isEntityPackage)
      this.landscapeRestructure.addSubPackage(this.args.entity);
  }

  @action
  addClass() {
    if (this.isEntityPackage)
      this.landscapeRestructure.addClass(this.args.entity);
  }

  @action
  deleteMesh() {
    if (this.isEntityApplication)
      this.landscapeRestructure.deleteApp(this.args.entity);
    else if (this.isEntityPackage)
      this.landscapeRestructure.deletePackage(this.args.entity);
    else if (this.isEntityClass)
      this.landscapeRestructure.deleteClass(this.args.entity);
  }

  @action
  cutMesh() {
    if (this.isEntityPackage)
      this.landscapeRestructure.cutPackage(this.args.entity);
    else if (this.isEntityClass)
      this.landscapeRestructure.cutClass(this.args.entity);
  }

  @action
  setCommunicationSource() {
    this.landscapeRestructure.setCommunicationSourceClass(this.args.entity);
  }

  @action
  setCommunicationTarget() {
    this.landscapeRestructure.setCommunicationTargetClass(this.args.entity);
  }

  @action
  insertMesh() {
    this.landscapeRestructure.insertPackageOrClass(this.args.entity);
  }
}
