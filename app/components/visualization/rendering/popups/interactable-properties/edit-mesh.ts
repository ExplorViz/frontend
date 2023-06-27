import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { isApplication, isClass, isPackage } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

interface Args {
    entity : any;
    appId: string;
  }

export default class EditMesh extends Component<Args> {
    
    @service('landscape-restructure')
    landscapeRestructure!: LandscapeRestructure;

    @tracked 
    iconName = 'pin-16';

    @action
    addMesh() {
        if(isPackage(this.args.entity))
            this.landscapeRestructure.addPackageFromPopup(this.args.entity);
    }

    @action
    addClass() {
        if(isPackage(this.args.entity))
            this.landscapeRestructure.addClassFromPopup(this.args.entity);
    }

    @action
    deleteMesh() {

    }
    
}
