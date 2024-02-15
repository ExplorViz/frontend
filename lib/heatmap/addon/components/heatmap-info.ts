import Component from '@glimmer/component';
import { action } from '@ember/object';
import { Metric } from 'heatmap/services/heatmap-configuration';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';

interface HeatmapInfoArgs {
  metrics: Metric[];
  updateMetric(metric: Metric): void;
  selectedMetric: Metric | null;
}

export default class HeatmapInfo extends Component<HeatmapInfoArgs> {
  element!: HTMLElement;

  lastMousePosition: Position2D = {
    x: 0,
    y: 0,
  };

  @action
  dragMouseDown(event: MouseEvent) {
    event.stopPropagation();
    // get the mouse cursor position at startup:
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
    document.onpointerup = this.closeDragElement;
    // call a function whenever the cursor moves:
    document.onpointermove = this.elementDrag;
  }

  // eslint-disable-next-line class-methods-use-this
  closeDragElement() {
    /* stop moving when mouse button is released: */
    document.onpointerup = null;
    document.onpointermove = null;
  }

  @action
  elementDrag(event: MouseEvent) {
    event.preventDefault();
    // calculate the new cursor position:
    const diffX = this.lastMousePosition.x - event.clientX;
    const diffY = this.lastMousePosition.y - event.clientY;
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
    // set the element's new position:
    const containerDiv = this.element.parentElement as HTMLElement;

    const popoverHeight = this.element.clientHeight;
    const popoverWidth = this.element.clientWidth;

    let newPositionX = this.element.offsetLeft - diffX;
    let newPositionY = this.element.offsetTop - diffY;

    if (newPositionX < 0) {
      newPositionX = 0;
    } else if (
      containerDiv.clientWidth &&
      newPositionX > containerDiv.clientWidth - popoverWidth
    ) {
      newPositionX = containerDiv.clientWidth - popoverWidth;
    }

    if (newPositionY < 0) {
      newPositionY = 0;
    } else if (
      containerDiv.clientHeight &&
      newPositionY > containerDiv.clientHeight - popoverHeight
    ) {
      newPositionY = containerDiv.clientHeight - popoverHeight;
    }

    this.element.style.top = `${newPositionY}px`;
    this.element.style.left = `${newPositionX}px`;
  }

  @action
  setPopupPosition(popoverDiv: HTMLDivElement) {
    this.element = popoverDiv;

    const containerDiv = this.element.parentElement as HTMLElement;

    this.element.style.top = '100px';
    this.element.style.left = `${
      containerDiv.clientWidth - this.element.clientWidth - 15
    }px`;
  }
}
