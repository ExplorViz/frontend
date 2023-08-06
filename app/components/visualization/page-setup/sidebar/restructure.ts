import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { tracked } from '@glimmer/tracking';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import {
  StructureLandscapeData,
  isClass,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';

interface VisualizationPageSetupSidebarRestructureArgs {
  landscapeData: LandscapeData;
  restructureLandscape: (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => void;
  visualizationPaused: boolean;
  toggleVisualizationUpdating: () => void;
  resetLandscapeListenerPolling: () => void;
  removeComponent(componentPath: string): void;
}

export default class VisualizationPageSetupSidebarRestructure extends Component<VisualizationPageSetupSidebarRestructureArgs> {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @tracked
  clipboard: string = '';

  @tracked
  methodName: string = '';

  @tracked
  sourceClass: string = '';

  @tracked
  targetClass: string = '';

  @tracked
  issues: { title: string; content: string }[] = [];

  @tracked
  restructureMode: boolean = this.landscapeRestructure.restructureMode;

  @tracked
  communicationBtnDisabled: boolean = true;

  get clip_board() {
    return this.landscapeRestructure.clipboard;
  }

  @action
  close() {
    this.args.removeComponent('restructure-landscape');
  }

  @action
  toggleRestructureMode() {
    this.restructureMode = this.landscapeRestructure.toggleRestructureMode();
    if (this.restructureMode) {
      this.landscapeRestructure.setLandscapeData(this.args.landscapeData);

      this.args.resetLandscapeListenerPolling();
      if (!this.args.visualizationPaused) {
        this.args.toggleVisualizationUpdating();
      }

      AlertifyHandler.showAlertifyMessage('Restructure Mode enabled');
    } else {
      if (this.args.visualizationPaused) {
        this.args.toggleVisualizationUpdating();
      }
      AlertifyHandler.showAlertifyMessage('Restructure Mode disabled');
    }
  }

  @action
  addSourceClassFromClipboard() {
    if (isClass(this.landscapeRestructure.clippedMesh)) {
      this.sourceClass = this.clip_board;
      this.canCreateCommunication();
      this.landscapeRestructure.setSourceOrTargetClass('source');
    }
  }

  @action
  addTargetClassFromClipboard() {
    if (isClass(this.landscapeRestructure.clippedMesh)) {
      this.targetClass = this.clip_board;
      this.canCreateCommunication();
      this.landscapeRestructure.setSourceOrTargetClass('target');
    }
  }

  @action
  updateMethodName(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.methodName = target.value;
    this.canCreateCommunication();
  }

  @action
  resetSourceClass() {
    this.sourceClass = '';
    this.canCreateCommunication();
  }

  @action
  resetTargetClass() {
    this.targetClass = '';
    this.canCreateCommunication();
  }

  @action
  canCreateCommunication() {
    this.communicationBtnDisabled =
      this.methodName === '' ||
      this.sourceClass === '' ||
      this.targetClass === '';
  }

  @action
  createCommunication() {
    this.landscapeRestructure.createCommunication(this.methodName);
  }

  @action
  resetClipboardBtn() {
    this.landscapeRestructure.resetClipboard();
  }

  @action
  addFoundation() {
    this.landscapeRestructure.addFoundation();
  }

  @action
  addPackage() {
    this.landscapeRestructure.addPackage();
  }

  @action
  addClass() {
    this.landscapeRestructure.addClass();
  }

  @action
  createIssue() {
    const changelog = this.landscapeRestructure.changeLog.getChangeLogs();
    this.issues = [...this.issues, { title: '', content: changelog }];
  }

  @action
  updateIssueTitle(index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    this.issues[index].title = target.value;
  }

  @action
  updateIssueContent(index: number, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.issues[index].content = target.value;
  }
}
