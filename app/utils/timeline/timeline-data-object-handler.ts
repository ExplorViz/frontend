import { tracked } from '@glimmer/tracking';
import { Timestamp } from '../landscape-schemes/timestamp';
import { inject as service } from '@ember/service';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import { setOwner } from '@ember/application';
import RenderingService from 'explorviz-frontend/services/rendering-service';
import { action } from '@ember/object';

export type TimelineDataObject = {
  timestamps: Timestamp[];
  highlightedMarkerColor: 'blue' | 'red';
  selectedTimestamps: Timestamp[];
};

export default class TimelineDataObjectHandler {
  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  @service('rendering-service')
  renderingService!: RenderingService;

  @tracked timelineDataObject: TimelineDataObject = {
    timestamps: [...this.timestampRepo.timestamps.values()] ?? [],
    highlightedMarkerColor: 'blue',
    selectedTimestamps: [],
  };

  constructor(owner: any) {
    // https://stackoverflow.com/questions/65010591/emberjs-injecting-owner-to-native-class-from-component
    setOwner(this, owner);
    //this.timestampRepo.on('updated', this, this.updateTimestamps);
  }

  get timestamps() {
    return this.timelineDataObject.timestamps;
  }

  get selectedTimestamps() {
    return this.timelineDataObject.selectedTimestamps;
  }

  get highlightedMarkerColor() {
    return this.timelineDataObject.highlightedMarkerColor;
  }

  updateTimestamps(
    timestamps: Timestamp[] = [...this.timestampRepo.timestamps.values()]
  ) {
    this.timelineDataObject.timestamps = timestamps;
  }

  updateSelectedTimestamps(selectedTimestamps: Timestamp[]) {
    this.timelineDataObject.selectedTimestamps = selectedTimestamps;
  }

  updateHighlightedMarkerColor(highlightedMarkerColor: 'blue' | 'red') {
    this.timelineDataObject.highlightedMarkerColor = highlightedMarkerColor;
  }

  @action
  async timelineClicked(selectedTimestamps: Timestamp[]) {
    if (
      this.selectedTimestamps.length > 0 &&
      selectedTimestamps[0] === this.selectedTimestamps[0]
    ) {
      return;
    }
    this.renderingService.pauseVisualizationUpdating(false);
    this.renderingService.triggerRenderingForGivenTimestamp(
      selectedTimestamps[0].epochMilli,
      selectedTimestamps
    );
  }

  triggerTimelineUpdate() {
    // Calling this in each update function will multiple renderings,
    // therefore we manually call it when the updated data object is ready
    // Additionally, we can manually trigger this update after the gsap
    // animation of the play/pause icon

    // eslint-disable-next-line no-self-assign
    this.timelineDataObject = this.timelineDataObject;
  }
}
