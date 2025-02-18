import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';
import ENV from 'explorviz-frontend/config/environment';
import AdditionalTokenInfo from 'react-lib/src/components/additional-token-info.tsx';
const { spanService } = ENV.backendAddresses;

interface Args {
  tokens: LandscapeToken[];
  openTokenCreationModal(): void;
  selectToken(token: LandscapeToken): void;
  deleteToken(tokenId: string): Promise<undefined>;
  reload(): void;
}

export default class TokenSelection extends Component<Args> {
  // React component refs
  additionalTokenInfo = AdditionalTokenInfo;

  @service('auth')
  auth!: Auth;

  @tracked
  sortProperty: keyof LandscapeToken = 'value';

  @tracked
  sortOrder: 'asc' | 'desc' = 'asc';

  @action
  sortBy(property: keyof LandscapeToken) {
    if (property === this.sortProperty) {
      if (this.sortOrder === 'asc') {
        this.sortOrder = 'desc';
      } else {
        this.sortOrder = 'asc';
      }
    } else {
      this.sortOrder = 'asc';
      this.sortProperty = property;
    }
  }

  @action
  downloadDemoSupplierFiles(token: LandscapeToken, event: MouseEvent) {
    event?.stopPropagation();
    this.downloadJSONFile(
      `${spanService}/v2/landscapes/${token.value}/structure`,
      'structure.json'
    );
    this.downloadJSONFile(
      `${spanService}/v2/landscapes/${token.value}/dynamic`,
      'dynamic.json'
    );
    this.downloadJSONFile(
      `${spanService}/v2/landscapes/${token.value}/timestamps`,
      'timestamps.json'
    );
  }

  async downloadJSONFile(url: string, filename = 'data.json') {
    try {
      // Fetch the JSON data from the backend service
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error fetching JSON: ${response.statusText}`);
      }

      // Parse the response as JSON
      const data = await response.json();

      // Convert the JSON data to a Blob
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      // Create a temporary link element
      const tempLink = document.createElement('a');
      tempLink.href = URL.createObjectURL(jsonBlob);
      tempLink.download = filename;

      // Append the link to the body and trigger the download
      document.body.appendChild(tempLink);
      tempLink.click();

      // Clean up: Remove the link and release the object URL
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(tempLink.href);

      console.log('JSON file downloaded successfully.');
    } catch (error) {
      console.error('Error downloading JSON file:', error);
    }
  }
}
