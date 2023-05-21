import Component from '@glimmer/component';
import { action } from '@ember/object';

interface Args {
    removeComponent(componentPath: string): void;
}

export default class Restructure extends Component<Args>{
    @action
    close() {
      this.args.removeComponent('restructure-landscape');
    }
}