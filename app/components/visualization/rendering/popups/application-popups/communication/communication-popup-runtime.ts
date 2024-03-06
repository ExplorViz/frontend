import GlimmerComponent from '@glimmer/component';
import {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';

interface Args {
  communication: ClazzCommuMeshDataModel;
  showApplication?(applicationId: string): void;
  toggleHighlightById(modelId: string): void;
  openParents(entity: Class | Package, applicationId: string): void;
  readonly selectedCommits: Map<string, SelectedCommit[]>;
  readonly selectedApplication: string;
}

export default class CommunicationPopup extends GlimmerComponent<Args> {
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  get application() {
    return this.args.communication.application;
  }

  get firstSelectedCommitCalculateAggregatedRequestCount() {
    return this.args.communication.communication.totalRequests[0];
  }

  get secondSelectedCommitCalculateAggregatedRequestCount() {
    return this.args.communication.communication.totalRequests[1];
  }

  get getNumOfCurrentSelectedCommits() {
    return (
      this.args.selectedCommits.get(this.args.selectedApplication)?.length || 0
    );
  }

  get firstSelectedCommitMethodCalls() {
    return this.args.communication.communication.methodCalls[0];
  }

  get secondSelectedCommitMethodCalls() {
    return this.args.communication.communication.methodCalls[1];
  }

  get firstSelectedCommitTotalRequests() {
    return this.args.communication.communication.totalRequests[0];
  }

  get secondSelectedCommitTotalRequests() {
    return this.args.communication.communication.totalRequests[1];
  }

  get firstSelectedCommitId() {
    return (
      this.args.selectedCommits
        .get(this.args.selectedApplication)![0]
        .commitId.slice(0, 5) + '...'
    );
  }

  get secondSelectedCommitId() {
    return (
      this.args.selectedCommits
        .get(this.args.selectedApplication)![1]
        .commitId.slice(0, 5) + '...'
    );
  }

  @action
  highlightEntity(entity: Package | Class, applicationId: string) {
    this.args.openParents(entity, applicationId);
    this.args.toggleHighlightById(entity.id);
    this.args.showApplication?.(applicationId);
  }
}
