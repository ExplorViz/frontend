import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';

interface SecondaryInteractionButtonArgs {
  handleSecondaryCrosshairInteraction(): void;
}

export default class SecondaryInteractionButton extends Component<SecondaryInteractionButtonArgs> {
  @service('highlighting-service')
  highlightingService!: HighlightingService;
}
