import { tracked } from '@glimmer/tracking';
import { Timestamp } from '../landscape-schemes/timestamp';
import { inject as service } from '@ember/service';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import { setOwner } from '@ember/application';

export default class TimelineDataObject {
  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  get timestamps() {
    return [...this.timestampRepo.timelineTimestamps.values()] ?? [];
  }

  @tracked
  highlightedMarkerColor = 'blue';

  @tracked
  selectedTimestamps: Timestamp[] = [];

  constructor(owner: any) {
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
  }
}
