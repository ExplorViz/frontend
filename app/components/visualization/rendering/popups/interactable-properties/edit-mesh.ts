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
interface Args {
  entity: any;
  appId: string;
}

export default class EditMesh extends Component<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @tracked
  iconName = 'pin-16';

  get isEntityApplication() {
    return isApplication(this.args.entity);
  }

  get isEntityPackage() {
    return isPackage(this.args.entity);
  }

  get isEntityClass() {
    return isClass(this.args.entity);
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
    console.log(this.args.entity);
    if (this.isEntityApplication)
      this.landscapeRestructure.addPackageFromPopup(this.args.entity);
    else if (this.isEntityPackage)
      this.landscapeRestructure.addSubPackageFromPopup(this.args.entity);
  }

  @action
  addClass() {
    if (this.isEntityPackage)
      this.landscapeRestructure.addClassFromPopup(this.args.entity);
  }

  @action
  deleteMesh() {
    if (this.isEntityApplication)
      this.landscapeRestructure.deleteAppFromPopup(this.args.entity);
    else if (this.isEntityPackage)
      this.landscapeRestructure.deletePackageFromPopup(this.args.entity);
    else if (this.isEntityClass)
      this.landscapeRestructure.deleteClassFromPopup(this.args.entity);
  }

  @action
  cutMesh() {
    if (this.isEntityPackage)
      this.landscapeRestructure.cutPackageFromPopup(this.args.entity);
    else if (this.isEntityClass)
      this.landscapeRestructure.cutClassFromPopup(this.args.entity);
  }

  @action
  insertMesh() {
    this.landscapeRestructure.insertPackageOrClassFromPopup(this.args.entity);
  }
}
