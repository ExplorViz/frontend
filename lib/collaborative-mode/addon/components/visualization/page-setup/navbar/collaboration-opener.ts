import { action } from '@ember/object';
import Component from '@glimmer/component';

interface CollaborationOpenerArgs {
  toggleSettingsSidebarComponent(componentPath: string): void;
}

export default class CollaborationOpener extends Component<CollaborationOpenerArgs> {
  @action
  showCollaborationControls() {
    this.args.toggleSettingsSidebarComponent('collaboration-controls');
  }
}
