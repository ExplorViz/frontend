import { tracked } from '@glimmer/tracking';
import { Timestamp } from '../landscape-schemes/timestamp';

export default class TimelineStateObject {
  @tracked
  timelineTimestamps: Timestamp[] = [];

  @tracked
  highlightedMarkerColor = 'blue';

  @tracked
  selectedTimestamps: Timestamp[] = [];
}
