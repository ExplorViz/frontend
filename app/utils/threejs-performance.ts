// @ts-ignore
import Stats from 'stats.js';
import $ from 'jquery';

declare const THREEx: any;

/**
* @class THREEPerformance
*
* @module explorviz
* @submodule visualization.rendering
*/
export default class THREEPerformance {
  // Can display information like fps or memory usage
  stats: any = new Stats();

  // Displays data about current scene and the currently active renderer
  threexStats: any = new THREEx.RendererStats();

  constructor() {
    // 0: fps, 1: ms, 2: mb, 3+: custom or just click the window to toggle
    this.stats.showPanel(0);
    // Position performance panel at left edge of rendering canvas
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.bottom = '368px';
    this.stats.dom.style.top = null;
    this.stats.dom.style.zIndex = '100';
    this.stats.dom.style.left = '0px';
    $('#rendering').append(this.stats.dom);

    this.threexStats.domElement.style.position = 'absolute';
    this.threexStats.domElement.style.bottom = '200px';
    $('#rendering').append(this.threexStats.domElement);
  }

  /**
   * Removes performance panel (including fps and renderer stats) from
   * the DOM.
   */
  removePerformanceMeasurement() {
    $(this.stats.dom).remove();
    $(this.threexStats.domElement).remove();
  }
}
