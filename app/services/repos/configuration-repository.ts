import Service from '@ember/service';

import Evented from '@ember/object/evented';
import debugLogger from 'ember-debug-logger';

export interface ConfigurationItem {
  id: string,
  name: string,
  key: string,
  color: string,
  status: boolean,
}


/**
* Handles all timestamp-based configurations within the application (Timeline, Softwaremetrics)
*
* @class Configuration-Repository-Service
* @extends Ember.Service
*/
export default class ConfigurationRepository extends Service.extend(Evented) {
  debug = debugLogger();

  private configurations: Map<string, ConfigurationItem[]> = new Map();

  private softwaremetrics: Map<string, string[]> = new Map();

  // Getter
  getConfiguration(landscapeToken: string) {
    return this.configurations.get(landscapeToken) ?? [];
  }

  getActiveConfigurations(landscapeToken: string) {
    return this.getConfiguration(landscapeToken).filter((x) => x.status).map((x) => x.id) ?? [];
  }

  getSoftwaremetrics(landscapeToken: string) {
    return this.softwaremetrics.get(landscapeToken) ?? [];
  }

  // Add
  addConfiguration(landscapeToken: string, name: string, key: string, color: string) {
    const config = this.getConfiguration(landscapeToken);

    // Build ConfigurationItem
    /**
     * Generates a unique string ID
     */
    //  See: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    function uuidv4() {
      /* eslint-disable */
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
      });
      /* eslint-enable */
    }
    const item = {
      id: uuidv4(), name, key, color, status: false,
    };
    this.configurations.set(landscapeToken, [...config, item]);
    this.triggerCommitlineUpdate();
    return item.id;
  }

  addSoftwaremetric(landscapeToken: string, metric: string) {
    const metrics = this.getSoftwaremetrics(landscapeToken);
    if (metrics) {
      if (!(metrics.includes(metric))) {
        this.softwaremetrics.set(landscapeToken, [...metrics, metric]);
      }
    }
    
     this.triggerCommitlineUpdate();
  }

  // Remove
  removeConfiguration(landscapeToken: string, id: string) {
    const config = this.getConfiguration(landscapeToken);
    this.configurations.set(landscapeToken, config.filter((x) => x.id !== id));
    this.deactiveConfiguration(landscapeToken, id);
    this.triggerCommitlineUpdate();
    this.triggerPlotUpdate();
  }

  // Active and deactive Configurations
  activateConfiguration(landscapeToken: string, id: string) {
    const config = this.getConfiguration(landscapeToken).find((x) => x.id === id);
    if (config) {
      this.editConfiguration(
        landscapeToken,
        {
          id: config.id, name: config.name, key: config.key, color: config.color, status: true,
        },
      );
    }
    this.triggerCommitlineUpdate();
    this.triggerPlotUpdate();
  }

  deactiveConfiguration(landscapeToken: string, id: string) {
    const config = this.getConfiguration(landscapeToken).find((x) => x.id === id);
    if (config) {
      this.editConfiguration(
        landscapeToken,
        {
          id: config.id, name: config.name, key: config.key, color: config.color, status: false,
        },
      );
    }
    this.triggerCommitlineUpdate();
    this.triggerPlotUpdate();
  }

  // Edit Configuration
  editConfiguration(landscapeToken: string, configuration: ConfigurationItem) {
    const configs = this.getConfiguration(landscapeToken);
    const config = configs.find((x) => x.id === configuration.id);
    if (config) {
      const index = configs.indexOf(config);
      this.configurations.set(
        landscapeToken,
        [...configs.slice(0, index), configuration, ...configs.slice(index + 1)],
      );
    }
    this.triggerCommitlineUpdate();
  }

  triggerCommitlineUpdate() {
    this.trigger('updated');
  }

   triggerPlotUpdate() {
    this.trigger('updatePlot');
  }
}

declare module '@ember/service' {
  interface Registry {
    'repos/configuration-repository': ConfigurationRepository;
  }
}
