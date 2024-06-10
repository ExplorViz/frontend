import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { tracked } from '@glimmer/tracking';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import CollaborationSession from 'collaboration/services/collaboration-session';
import Changelog from 'explorviz-frontend/services/changelog';
import { format } from 'date-fns';
import convertDate from 'explorviz-frontend/utils/helpers/time-convter';
import PopupData from 'explorviz-frontend/components/visualization/rendering/popups/popup-data';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import AnnotationData from 'explorviz-frontend/components/visualization/rendering/annotations/annotation-data';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';
import RoomSerializer from 'collaboration/services/room-serializer';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import LocalUser from 'collaboration/services/local-user';
import Auth from 'explorviz-frontend/services/auth';
import ENV from 'explorviz-frontend/config/environment';

interface VisualizationPageSetupSidebarRestructureArgs {
  landscapeData: LandscapeData;
  restructureLandscape: (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => void;
  visualizationPaused: boolean;
  popUpData: PopupData[];
  landscapeToken: LandscapeToken;
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
  toggleVisualizationUpdating: () => void;
  removeTimestampListener: () => void;
}

const shareSnapshotURL = ENV.shareSnapshotURL;

export default class VisualizationPageSetupSidebarRestructure extends Component<VisualizationPageSetupSidebarRestructureArgs> {
  today: string = format(new Date().getTime() + 86400 * 1000, 'yyyy-MM-dd');

  @service('auth')
  auth!: Auth;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('changelog')
  changeLog!: Changelog;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  @service('local-user')
  localUser!: LocalUser;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  // @tracked
  // token: string = localStorage.getItem('gitAPIToken') || '';

  @tracked
  token: string = '';

  @tracked
  issueURL: string = localStorage.getItem('gitIssue') || '';

  @tracked
  uploadURL: string = localStorage.getItem('gitUpload') || '';

  @tracked
  appName: string = '';

  @tracked
  language: string = '';

  @tracked
  clipboard: string = '';

  @tracked
  methodName: string = '';

  @tracked
  logTexts: string[] = [];

  @tracked
  issues: { title: string; content: string; screenshots: string[] }[] = [];

  @tracked
  restructureMode: boolean = this.landscapeRestructure.restructureMode;

  @tracked
  saveCredBtnDisabled: boolean = true;

  @tracked
  createAppBtnDisabled: boolean = true;

  @tracked
  uploadIssueBtnDisabled: boolean = false;

  @tracked
  snapshotModal: boolean = false;

  @tracked
  index: number | null = null;

  @tracked
  snapshotName: string | null = null;

  @tracked
  saveSnaphotBtnDisabled: boolean = true;

  @tracked
  expDate: number | null = null;

  @tracked
  createPersonalSnapshot = false;

  get clip_board() {
    return this.landscapeRestructure.clipboard;
  }

  get _sourceClass() {
    return this.landscapeRestructure.sourceClass?.name;
  }

  get _targetClass() {
    return this.landscapeRestructure.targetClass?.name;
  }

  @action
  getActionColor(index: number) {
    const logEntry = this.changeLog.changeLogEntries[index];
    switch (logEntry?.action) {
      case 'CREATE':
        return 'text-primary';
      case 'RENAME':
        return 'text-secondary';
      case 'DELETE':
        return 'text-danger';
      case 'CUTINSERT':
        return 'text-warning';
      default:
        return '';
    }
  }

  @action
  toggleCheckBox(index: number) {
    const checkBox = document.getElementById(
      'checkbox-' + index
    ) as HTMLInputElement;
    const card = document.getElementById('card-' + index) as HTMLDivElement;
    checkBox.checked = !checkBox.checked;

    if (checkBox.checked) {
      card.classList.add('bg-secondary');
      card.classList.add('text-white');
    } else {
      card.classList.remove('bg-secondary');
      card.classList.remove('text-white');
    }
  }

  @action
  toggleSelectAll() {
    const selectAllCheckbox = document.getElementById(
      'selectAll'
    ) as HTMLInputElement;
    const isChecked = selectAllCheckbox.checked;

    for (let i = 0; i < this.logTexts.length; i++) {
      const checkBox = document.getElementById(
        'checkbox-' + i
      ) as HTMLInputElement;
      const card = document.getElementById('card-' + i) as HTMLDivElement;

      if (isChecked && !checkBox.checked) {
        checkBox.checked = true;
        card.classList.add('bg-secondary');
        card.classList.add('text-white');
      } else if (!isChecked && checkBox.checked) {
        checkBox.checked = false;
        card.classList.remove('bg-secondary');
        card.classList.remove('text-white');
      }
    }
  }

  @action
  addSelectedEntriesToIssue(issueIndex: number) {
    const issue = this.issues[issueIndex];
    let newContent = issue.content;

    for (let i = 0; i < this.logTexts.length; i++) {
      const checkbox = document.getElementById(
        'checkbox-' + i
      ) as HTMLInputElement;

      if (checkbox && checkbox.checked) {
        const entry = this.logTexts[i];
        newContent += `${entry}\n`;
      }
    }

    const updatedIssue = {
      ...issue,
      content: newContent,
    };

    const updatedIssues = [];
    for (const [index, issue] of this.issues.entries()) {
      if (index === issueIndex) {
        updatedIssues.push(updatedIssue);
      } else {
        updatedIssues.push(issue);
      }
    }

    this.issues = updatedIssues;
  }

  @action
  toggleRestructureMode() {
    this.restructureMode = this.landscapeRestructure.restructureMode;
    if (this.restructureMode) {
      if (this.collaborationSession.isOnline)
        this.args.removeTimestampListener();
      this.landscapeRestructure.setLandscapeData(this.args.landscapeData);

      if (!this.args.visualizationPaused) {
        this.args.toggleVisualizationUpdating();
      }

      this.toastHandlerService.showInfoToastMessage('Restructure Mode enabled');
    } else {
      if (this.args.visualizationPaused) {
        this.args.toggleVisualizationUpdating();
      }
      this.landscapeRestructure.resetLandscapeRestructure();
      this.toastHandlerService.showInfoToastMessage(
        'Restructure Mode disabled'
      );
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
  }

  @action
  updateToken(event: any) {
    // console.log(event.target.value);
    // const target = event.target as HTMLInputElement;
    this.token = event.target.value;
    this.canSaveCredentials();
  }

  @action
  updateIssueURL(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.issueURL = target.value;
    this.canSaveCredentials();
  }

  @action
  updateUploadURL(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.uploadURL = target.value;
    this.canSaveCredentials();
  }

  @action
  resetSourceClass() {
    this.landscapeRestructure.sourceClass = null;
  }

  @action
  resetTargetClass() {
    this.landscapeRestructure.targetClass = null;
  }

  @action
  canSaveCredentials() {
    this.saveCredBtnDisabled = this.token === '' || this.issueURL === '';
    if (this.uploadURL) this.canUpload();
  }

  @action
  canCreateApplication() {
    this.createAppBtnDisabled = this.appName === '' || this.language === '';
  }

  @action
  createCommunication() {
    this.landscapeRestructure.addCommunication(this.methodName);
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
  showChangelog() {
    const changelog = this.landscapeRestructure.changeLog.getChangeLog();
    this.logTexts = changelog;
  }

  @action
  createIssue() {
    this.issues = [...this.issues, { title: '', content: '', screenshots: [] }];
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
  addSnapshotLink(index: number, url: string, name: string) {
    const updatedIssue = {
      ...this.issues[index],
      content: this.issues[index].content + '\n' + name + ': ' + url,
    };

    const updatedIssues = [];
    for (const [issueIndex, issue] of this.issues.entries()) {
      if (index === issueIndex) {
        updatedIssues.push(updatedIssue);
      } else {
        updatedIssues.push(issue);
      }
    }

    this.issues = updatedIssues;
  }

  @action
  deleteIssue(index: number) {
    this.issues.removeAt(index);
  }

  @action
  deleteScreenshot(issueIndex: number, screenshotIndex: number) {
    this.issues[issueIndex].screenshots.removeAt(screenshotIndex);
    this.canUpload();
  }

  @action
  screenshotCanvas(index: number) {
    const canvas = this.landscapeRestructure.canvas;
    const screenshotDataURL = canvas.toDataURL('image/png');
    this.issues[index].screenshots.pushObject(screenshotDataURL);
    this.canUpload();
  }

  @action
  openSnapshotModal(index: number) {
    this.snapshotModal = true;
    this.index = index;
  }

  @action
  closeSnaphshotModal() {
    this.snapshotModal = false;
    this.index = null;
    this.snapshotName = null;
    this.expDate = null;
    this.saveSnaphotBtnDisabled = true;
  }

  @action
  updateName(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.snapshotName = target.value;
    this.canSaveSnapShot();
  }

  @action
  canSaveSnapShot() {
    if (this.snapshotName !== '') {
      this.saveSnaphotBtnDisabled = false;
    } else {
      this.saveSnaphotBtnDisabled = true;
    }
  }

  @action
  updateExpDate(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const date = convertDate(target.value);
    this.expDate = date;
  }

  @action
  createSnapshot() {
    const allAnnotations = this.args.annotationData.concat(
      this.args.minimizedAnnotations
    );

    const createdAt: number = new Date().getTime();
    const saveRoom = this.roomSerializer.serializeRoom(
      this.args.popUpData,
      allAnnotations,
      true
    );

    const timestamps = this.timestampRepo.getTimestamps(
      this.args.landscapeToken.value
    );

    const sharedToken: SnapshotToken = {
      owner: this.auth.user!.sub,
      createdAt: createdAt,
      name: this.snapshotName!,
      landscapeToken: this.args.landscapeToken,
      structureData: {
        structureLandscapeData: this.args.landscapeData.structureLandscapeData,
        dynamicLandscapeData: this.args.landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      timestamps: { timestamps: timestamps },
      camera: {
        x: this.localUser.camera.position.x,
        y: this.localUser.camera.position.y,
        z: this.localUser.camera.position.z,
      },
      annotations: {},
      isShared: true,
      subscribedUsers: { subscriberList: [] },
      deleteAt: this.expDate !== null ? this.expDate : 0,
    };

    if (this.createPersonalSnapshot) {
      const personalToken: SnapshotToken = {
        owner: this.auth.user!.sub,
        createdAt: createdAt,
        name: this.snapshotName!,
        landscapeToken: this.args.landscapeToken,
        structureData: {
          structureLandscapeData:
            this.args.landscapeData.structureLandscapeData,
          dynamicLandscapeData: this.args.landscapeData.dynamicLandscapeData,
        },
        serializedRoom: saveRoom,
        timestamps: { timestamps: timestamps },
        camera: {
          x: this.localUser.camera.position.x,
          y: this.localUser.camera.position.y,
          z: this.localUser.camera.position.z,
        },
        annotations: {},
        isShared: true,
        subscribedUsers: { subscriberList: [] },
        deleteAt: this.expDate !== null ? this.expDate : 0,
      };
      this.snapshotService.saveSnapshot(personalToken);
    }

    this.snapshotService.saveSnapshot(sharedToken);

    const snapshotURL = `${shareSnapshotURL}visualization?landscapeToken=${sharedToken.landscapeToken.value}&owner=${sharedToken.owner}&createdAt=${sharedToken.createdAt}&sharedSnapshot=${true}`;

    this.addSnapshotLink(this.index!, snapshotURL, sharedToken.name);

    // this.issues[this.index!].content =
    //   this.issues[this.index!].content +
    //   '\n' +
    //   sharedToken.name +
    //   ': ' +
    //   snapshotURL;

    // console.log(this.issues[this.index!]);

    this.closeSnaphshotModal();
  }

  @action
  deleteEntry(index: number) {
    const entry = this.changeLog.changeLogEntries[index];
    const bundledCreateEntries = this.changeLog
      .isCreateBundle(entry, [])
      ?.reverse();

    if (bundledCreateEntries?.length) {
      this.landscapeRestructure.undoBundledEntries(bundledCreateEntries);
    } else {
      this.landscapeRestructure.undoEntry(entry);
    }
  }

  @action
  saveGitlabCredentials() {
    localStorage.setItem('gitAPIToken', this.token);
    localStorage.setItem('gitIssue', this.issueURL);
    localStorage.setItem('gitUpload', this.uploadURL);
  }

  @action
  canUpload() {
    const hasScreenshot = this.issues.some(
      (issue) => issue.screenshots && issue.screenshots.length > 0
    );
    if (hasScreenshot) {
      this.uploadIssueBtnDisabled = this.uploadURL === '';
    } else {
      this.uploadIssueBtnDisabled = false;
    }
  }

  @action
  async uploadIssueToGitLab() {
    try {
      const uploadPromises = this.issues.map(async (issue) => {
        // Upload the screenshots and get their URLs
        const screenshotUrls = await Promise.all(
          issue.screenshots.map((screenshot) =>
            this.uploadImageToRepository(screenshot)
          )
        );

        // Append the screenshot URLs to the issue content
        const contentWithScreenshots = `${issue.content}\n${screenshotUrls
          .map((url) => `![Screenshot](${url})`)
          .join('\n')}`;

        // Upload the issue
        const response = await fetch(this.issueURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            title: issue.title,
            description: contentWithScreenshots,
          }),
        });

        if (!response.ok) {
          this.toastHandlerService.showErrorToastMessage(
            `Failed to upload issue: ${issue.title}`
          );
          throw new Error(`Failed to upload issue: ${issue.title}`);
        }

        return response.json();
      });

      const results = await Promise.all(uploadPromises);

      this.toastHandlerService.showSuccessToastMessage(
        'Issue(s) successfully uploaded'
      );
      return results;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async uploadImageToRepository(dataURL: string) {
    const blob = await fetch(dataURL).then((res) => res.blob());
    const imgFile = new File([blob], 'screenshotCanva.png', {
      type: 'image/png',
    });
    const formData = new FormData();

    formData.append('file', imgFile);

    const res = await fetch(this.uploadURL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Failed to Upload Image');
    }

    const jsonRes = await res.json();
    return jsonRes.url;
  }
}
