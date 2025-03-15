import Service from '@ember/service';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import { useConfigurationStore } from 'react-lib/src/stores/configuration';

/**
 * The Configuration Service handles settings for the
 * visualization (which are not persisted in LocalStorage)
 */
export default class Configuration extends Service {
  // #region APPLICATION LAYOUT

  // @tracked
  // isCommRendered = true;
  get isCommRendered(): boolean {
    return useConfigurationStore.getState().isCommRendered;
  }

  set isCommRendered(value: boolean) {
    useConfigurationStore.setState({ isCommRendered: value });
  }

  // commCurveHeightDependsOnDistance = true;
  get commCurveHeightDependsOnDistance(): boolean {
    return useConfigurationStore.getState().commCurveHeightDependsOnDistance;
  }

  set commCurveHeightDependsOnDistance(value: boolean) {
    useConfigurationStore.setState({ commCurveHeightDependsOnDistance: value });
  }

  // Determines height of class communication curves, 0 results in straight lines
  // @tracked
  // commCurveHeightMultiplier = 1;
  get commCurveHeightMultiplier(): number {
    return useConfigurationStore.getState().commCurveHeightMultiplier;
  }

  set commCurveHeightMultiplier(value: number) {
    useConfigurationStore.setState({ commCurveHeightMultiplier: value });
  }

  // @tracked
  // commWidthMultiplier = 1;
  get commWidthMultiplier(): number {
    return useConfigurationStore.getState().commWidthMultiplier;
  }

  set commWidthMultiplier(value: number) {
    useConfigurationStore.setState({ commWidthMultiplier: value });
  }

  // @tracked
  // popupPosition: Position2D | undefined = undefined;
  get popupPosition(): Position2D | undefined {
    return useConfigurationStore.getState().popupPosition;
  }

  set popupPosition(value: Position2D | undefined) {
    useConfigurationStore.setState({ popupPosition: value });
  }

  // @tracked
  // annotationPosition: Position2D | undefined = undefined;
  get annotationPosition(): Position2D | undefined {
    return useConfigurationStore.getState().annotationPosition;
  }

  set annotationPosition(value: Position2D | undefined) {
    useConfigurationStore.setState({ annotationPosition: value });
  }

  get semanticZoomEnabled() {
    return useConfigurationStore.getState().semanticZoomEnabled;
  }

  set semanticZoomEnabled(isEnabled: boolean) {
    useConfigurationStore.setState({ semanticZoomEnabled: isEnabled });
  }

  // #endregion APPLICATION LAYOUT
}

declare module '@ember/service' {
  interface Registry {
    configuration: Configuration;
  }
}
