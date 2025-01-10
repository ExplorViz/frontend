import Component from '@glimmer/component';
import ArZoomHandler from 'explorviz-frontend/utils/extended-reality/ar-helpers/ar-zoom-handler';

interface ZoomButtonArgs {
  arZoomHandler: ArZoomHandler;
  handleZoomToggle(): void;
}

export default class ZoomButton extends Component<ZoomButtonArgs> {}
