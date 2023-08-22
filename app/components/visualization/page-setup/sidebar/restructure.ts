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
  token: string = localStorage.getItem('gitAPIToken') || '';

  @tracked
  repo: string = localStorage.getItem('gitRepo') || '';

  @tracked
  appName: string = '';

  @tracked
  language: string = '';

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
  saveCredBtnDisabled: boolean = true;

  @tracked
  createAppBtnDisabled: boolean = true;

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
  updateNewAppName(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.appName = target.value;
    this.canCreateApplication();
  }

  @action
  updateLanguage(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.language = target.value;
    this.canCreateApplication();
  }

  @action
  updateMethodName(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.methodName = target.value;
    this.canCreateCommunication();
  }

  @action
  updateToken(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.token = target.value;
    this.canSaveCredentials();
  }

  @action
  updateRepo(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.repo = target.value;
    this.canSaveCredentials();
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
  canSaveCredentials() {
    this.saveCredBtnDisabled = this.token === '' || this.repo === '';
  }

  @action
  canCreateCommunication() {
    this.communicationBtnDisabled =
      this.methodName === '' ||
      this.sourceClass === '' ||
      this.targetClass === '';
  }

  @action
  canCreateApplication() {
    this.createAppBtnDisabled = this.appName === '' || this.language === '';
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
    this.landscapeRestructure.addApplication(this.appName, this.language);
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

  @action
  saveGitlabCredentials() {
    localStorage.setItem('gitAPIToken', this.token);
    localStorage.setItem('gitRepo', this.repo);
  }

  @action
  checkForPlusKey(index: number, event: KeyboardEvent) {
    if (event.key === '+') {
      const target = event.target as HTMLTextAreaElement;
      const content = target.value;
      const splitIndex = target.selectionStart;

      const contentBeforePlus = content.substring(0, splitIndex - 1);
      const contentAfterPlus = content.substring(splitIndex);

      const updatedCurrentIssue = {
        ...this.issues[index],
        content: contentBeforePlus,
      };

      this.issues = [
        ...this.issues.slice(0, index),
        updatedCurrentIssue,
        ...this.issues.slice(index + 1),
        { title: '', content: contentAfterPlus },
      ];

      event.preventDefault();
    }
  }

  @action
  uploadIssueToGitLab() {
    Promise.all(
      this.issues.map((issue) => {
        return fetch(this.repo, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            title: issue.title,
            description: issue.content,
          }),
        }).then((response) => {
          if (!response.ok) {
            return Promise.reject(`Failed to upload issue: ${issue.title}`);
          }
          return response.json();
        });
      })
    )
      .then((results) => {
        // Do something with the results, such as logging them
        AlertifyHandler.showAlertifySuccess('Issue(s) successfully uploaded');
        console.log('Successfully uploaded all issues:', results);
        return results;
      })
      .catch((error) => {
        console.error(error);
        // Handle error as needed
      });
  }
}
