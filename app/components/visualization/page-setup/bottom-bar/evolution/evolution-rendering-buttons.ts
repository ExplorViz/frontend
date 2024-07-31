import Component from '@glimmer/component';
import CommitTreeStateService, {
  SelectedCommit,
} from 'explorviz-frontend/services/commit-tree-state';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import RenderingService from 'explorviz-frontend/services/rendering-service';

interface IArgs {
  selectedAppName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
}

export default class EvolutionRenderingButtons extends Component<IArgs> {
  @service('rendering-service')
  renderingService!: RenderingService;

  @service('commit-tree-state')
  commitTreeStateService!: CommitTreeStateService;

  get showSelectionButton() {
    return this.renderingService.userInitiatedStaticDynamicCombination;
  }

  get numberOfSelectedCommitsForCurrentApp() {
    return this.args.selectedCommits.get(this.args.selectedAppName)?.length;
  }

  @action
  unselectAllSelectedCommits(x: any) {
    this.commitTreeStateService.resetSelectedCommits();
    this.renderingService.triggerRenderingForSelectedCommits();
  }

  @action
  changeRenderingMode(x: any) {
    console.log('x', x);
  }
}
