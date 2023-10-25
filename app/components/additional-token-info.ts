import Component from '@glimmer/component';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import Auth from 'explorviz-frontend/services/auth';

interface Args {
  token: LandscapeToken;
}

export default class AdditionalTokenInfo extends Component<Args> {
  @service('auth')
  auth!: Auth;

  focusedClicks = 0;

  @action
  // eslint-disable-next-line class-methods-use-this
  onTokenIdCopied() {
    AlertifyHandler.showAlertifySuccess('Token id copied to clipboard');
  }

  @action
  // eslint-disable-next-line class-methods-use-this
  onTokenSecretCopied() {
    AlertifyHandler.showAlertifySuccess('Token secret copied to clipboard');
  }

  @action
  hidePopover(event: Event) {
    if (this.isMouseOnPopover()) {
      return;
    }

    // Clicks enable us to differentiate between opened and closed popovers
    if (this.focusedClicks % 2 === 1) {
      event.target?.dispatchEvent(new Event('click'));
    }
    this.focusedClicks = 0;
  }

  isMouseOnPopover() {
    const hoveredElements = document.querySelectorAll(':hover');

    for (const element of hoveredElements) {
      if (element.matches('.popover')) {
        return true;
      }
    }
    return false;
  }

  @action
  onClick(event: Event) {
    this.focusedClicks += 1;
    // Prevent click on table row which would trigger to open the visualization
    event.stopPropagation();
  }
}
