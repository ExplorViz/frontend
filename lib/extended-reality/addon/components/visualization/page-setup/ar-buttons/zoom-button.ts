import Component from '@glimmer/component';
import ArZoomHandler from 'extended-reality/utils/ar-helpers/ar-zoom-handler';

interface ZoomButtonArgs {
  arZoomHandler: ArZoomHandler;
  handleZoomToggle(): void;
}

export default class ZoomButton extends Component<ZoomButtonArgs> {}
