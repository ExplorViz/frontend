import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import { Metrics } from 'react-lib/src/utils/landscape-schemes/metrics-data';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { tracked } from '@glimmer/tracking';
import TimestampService from 'explorviz-frontend/services/timestamp';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';

const { metricsService } = ENV.backendAddresses;

export default class MetricDataComponent extends Component {
  helpTooltipComponent = HelpTooltip;

  @service('auth')
  auth!: Auth;

  @service('landscape-token')
  tokenService!: LandscapeTokenService;

  @service('timestamp')
  timestampService!: TimestampService;

  @service('toast-handler')
  toast!: ToastHandlerService;

  @tracked
  metrics: Metrics = [];

  /**
   * Asynchronously loads metrics data from the metric service.
   *
   * This action triggers a fetch request to the metric service using the current landscape token
   * and timestamp from the tokenService and timestampService respectively. It then processes the
   * raw data into a format compatible with the Metric interface.
   *
   * Throws an error if no landscape token is selected or if the fetch request fails.
   *
   * @action
   * @async
   * @throws {Error} When no landscape token is selected or the fetch request fails.
   * @returns {void} Updates the `metrics` property with the fetched and processed data.
   */
  @action
  async loadMetrics() {
    if (this.tokenService.token === null) {
      throw new Error('No landscape token selected');
    }
    try {
      const response = await fetch(
        `${metricsService}/metrics?landscapeToken=${this.tokenService.token.value}&timeStamp=${this.timestampService.timestamp}`
      );
      if (!response.ok) {
        this.toast.showErrorToastMessage(
          `HTTP error: ${response.status} when loading metrics`
        );
        return;
      }
      const rawData: any[] = await response.json();

      this.metrics = rawData.map((metricArray) => ({
        idk: metricArray[0],
        table: parseFloat(metricArray[1]),
        timestamp: new Date(metricArray[2]),
        value: parseFloat(metricArray[3]),
        name: metricArray[4],
        description: metricArray[5],
        landscapeToken: metricArray[6],
        unit: metricArray[7],
      }));
      this.toast.showSuccessToastMessage(`${rawData.length} metrics loaded`);
    } catch (error) {
      this.toast.showErrorToastMessage('Error loading metrics');
      console.error('Error loading metrics', error);
    }
  }
}
