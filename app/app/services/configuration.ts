import Service from '@ember/service';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import { useConfigurationStore } from 'some-react-lib/src/stores/configuration';

/**
 * The Configuration Service handles settings for the
 * visualization (which are not persisted in LocalStorage)
 */
export default class Configuration extends Service {
  get isCommRendered(): boolean {
    return useConfigurationStore.getState().isCommRendered;
  }

  set isCommRendered(value: boolean) {
    useConfigurationStore.setState({ isCommRendered: value });
  }

  get commCurveHeightDependsOnDistance(): boolean {
    return useConfigurationStore.getState().commCurveHeightDependsOnDistance;
  }

  set commCurveHeightDependsOnDistance(value: boolean) {
    useConfigurationStore.setState({ commCurveHeightDependsOnDistance: value });
  }

  get commCurveHeightMultiplier(): number {
    return useConfigurationStore.getState().commCurveHeightMultiplier;
  }

  set commCurveHeightMultiplier(value: number) {
    useConfigurationStore.setState({ commCurveHeightMultiplier: value });
  }

  get commWidthMultiplier(): number {
    return useConfigurationStore.getState().commWidthMultiplier;
  }

  set commWidthMultiplier(value: number) {
    useConfigurationStore.setState({ commWidthMultiplier: value });
  }

  get popupPosition(): Position2D | undefined {
    return useConfigurationStore.getState().popupPosition;
  }

  set popupPosition(value: Position2D | undefined) {
    useConfigurationStore.setState({ popupPosition: value });
  }
}

declare module '@ember/service' {
  interface Registry {
    configuration: Configuration;
  }
}
