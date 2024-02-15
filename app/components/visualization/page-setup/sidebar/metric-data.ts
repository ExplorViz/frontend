import Component from '@glimmer/component';
import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import { Metric, MetricLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/metric-data';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { tracked } from '@glimmer/tracking';
import TimestampService from 'explorviz-frontend/services/timestamp';

const { metricService } = ENV.backendAddresses;

export default class MetricDataComponent extends Component {

    @service('auth')
    auth!: Auth;

    @service('landscape-token')
    tokenService!: LandscapeTokenService;

    @service('timestamp')
    timestampService!: TimestampService;

    @tracked
    metrics: MetricLandscapeData = [];

    @action
    async loadMetrics() {
        if (this.tokenService.token === null) {
            throw new Error('No landscape token selected');  
        }
        try {
            console.log(this.timestampService.timestamp);
            
            const response = await fetch(`${metricService}/metrics?landscapeToken=${this.tokenService.token.value}&timeStamp=${this.timestampService.timestamp}`); //"ffb31fc2-24d3-4718-b72b-6f054055b69e"  &secret=${"0CgsRRsidIsv3Yw3"}  this.auth.accessToken
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            const rawData: any[] = await response.json();

            // Umwandlung der Daten in das Format des Metric-Interfaces
            this.metrics = rawData.map(metricArray => ({
                idk: metricArray[0],
                table: parseFloat(metricArray[1]),
                timestamp: new Date(metricArray[2]),
                value: parseFloat(metricArray[3]),
                name: metricArray[4],
                description: metricArray[5],
                landscapeToken: metricArray[6],
                unit: metricArray[7]
            }));
            console.log(this.metrics);

        } catch (error) {
            console.error('Error loading metrics', error);
        }
    
    }
}


