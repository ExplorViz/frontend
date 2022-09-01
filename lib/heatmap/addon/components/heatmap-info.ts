import Component from '@glimmer/component';
import { action } from '@ember/object';
import { Metric } from 'heatmap/services/heatmap-configuration';

interface HeatmapInfoArgs {
  metrics: Metric[];
  updateMetric(metric: Metric): void;
  selectedMetric: Metric | null;
}

export default class HeatmapInfo extends Component<HeatmapInfoArgs> {
  divElement!: HTMLElement;

  panDeltaX = 0;

  panDeltaY = 0;

  @action
  setupDragElement(element: HTMLElement) {
    this.divElement = element;

    this.initializePanListener();

    this.setupInitialPosition();
  }

  initializePanListener() {
    const mc = new Hammer(this.divElement);

    mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    // Keep track of pan distance since pan start
    mc.on('panstart', () => {
      this.panDeltaX = 0;
      this.panDeltaY = 0;
    });

    mc.on('panleft panright panup pandown', (ev) => {
      // Do not interfer with metric selection
      if (ev.target.className === 'string'
        && ev.target.className.includes('ember-power-select')) return;

      // Calculate positional difference since last pan event
      const currentDeltaX = this.panDeltaX - ev.deltaX;
      const currentDeltaY = this.panDeltaY - ev.deltaY;

      this.handlePan(currentDeltaX, currentDeltaY);

      this.panDeltaX = ev.deltaX;
      this.panDeltaY = ev.deltaY;
    });
  }

  setupInitialPosition() {
    if (!this.divElement) return;

    const containerDiv = this.divElement.parentElement as HTMLElement;

    this.divElement.style.top = '100px';
    this.divElement.style.left = `${containerDiv.clientWidth - this.divElement.clientWidth - 15}px`;
  }

  handlePan(deltaX: number, deltaY: number) {
    const self = this;

    function xPositionInsideWindow(minX: number, maxX: number) {
      return minX >= 0 && maxX <= window.innerWidth;
    }

    function yPositionInsideWindow(minY: number, maxY: number) {
      return minY >= 0 && maxY <= window.innerHeight;
    }

    function moveElement(xOffset: number, yOffset: number) {
      // Calculation of old and new coordinates
      const oldMinX = self.divElement.offsetLeft;
      const oldMaxX = oldMinX + self.divElement.clientWidth;
      const oldMinY = self.divElement.offsetTop;
      const oldMaxY = oldMinY + self.divElement.clientHeight;

      const newMinX = oldMinX - xOffset;
      const newMaxX = newMinX + self.divElement.clientWidth;
      const newMinY = oldMinY - yOffset;
      const newMaxY = newMinY + self.divElement.clientHeight;

      // Set the element's new position:
      if (!xPositionInsideWindow(oldMinX, oldMaxX) || xPositionInsideWindow(newMinX, newMaxX)) {
        self.divElement.style.left = `${newMinX}px`;
      }

      if (!yPositionInsideWindow(oldMinY, oldMaxY) || yPositionInsideWindow(newMinY, newMaxY)) {
        self.divElement.style.top = `${newMinY}px`;
      }
    }

    moveElement(deltaX, deltaY);
  }
}
