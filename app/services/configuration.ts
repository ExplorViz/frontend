import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';

/**
 * The Configuration Service handles settings for the
 * visualization (which are not persisted in LocalStorage)
 */
export default class Configuration extends Service {
  // #region APPLICATION LAYOUT

  @tracked
  isCommRendered = true;

  commCurveHeightDependsOnDistance = true;

  // Determines height of class communication curves, 0 results in straight lines
  @tracked
  commCurveHeightMultiplier = 1;

  @tracked
  commWidthMultiplier = 1;

  @tracked
  popupPosition: Position2D | undefined = undefined;

  @tracked
  annotationPosition: Position2D | undefined = undefined;

  // #endregion APPLICATION LAYOUT
}

declare module '@ember/service' {
  interface Registry {
    configuration: Configuration;
  }
}
