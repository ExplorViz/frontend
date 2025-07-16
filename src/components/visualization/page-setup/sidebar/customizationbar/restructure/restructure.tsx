import React, { useEffect, useMemo, useState } from 'react';

import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useChangelogStore } from 'explorviz-frontend/src/stores/changelog';
import { format } from 'date-fns';
import convertDate from 'explorviz-frontend/src/utils/helpers/time-convter';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import {
  useSnapshotTokenStore,
  SnapshotToken,
} from 'explorviz-frontend/src/stores/snapshot-token';
import { useRoomSerializerStore } from 'explorviz-frontend/src/stores/collaboration/room-serializer';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { ApiToken } from 'explorviz-frontend/src/stores/user-api-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import WideCheckbox from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/wide-checkbox';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import {
  DeviceCameraIcon,
  ImageIcon,
  TrashIcon,
  XIcon,
} from '@primer/octicons-react';
import { useShallow } from 'zustand/react/shallow';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';

const shareSnapshot = import.meta.env.VITE_SHARE_SNAPSHOT_URL;
const gitlabApi = import.meta.env.VITE_GIT_FACADE_SERV_URL;

type Issue = { title: string; content: string; screenshots: string[] };
type GitlabProject = { id: string; name: string };

interface RestructureProps {
  landscapeData: LandscapeData;
  restructureLandscape: (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) => void;
  visualizationPaused: boolean;
  landscapeToken: LandscapeToken;
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
  userApiTokens: ApiToken[];
  toggleVisualizationUpdating: () => void;
  removeTimestampListener: () => void;
}

export default function Restructure({
  landscapeData,
  restructureLandscape,
  visualizationPaused,
  landscapeToken,
  annotationData,
  minimizedAnnotations,
  userApiTokens,
  toggleVisualizationUpdating,
  removeTimestampListener,
}: RestructureProps) {
  // MARK: Stores

  const landscapeRestructureState = useLandscapeRestructureStore(
    useShallow((state) => ({
      restructureMode: state.restructureMode,
      clipboard: state.clipboard,
      sourceClass: state.sourceClass,
      targetClass: state.targetClass,
      canvas: state.canvas,
    }))
  );

  const landscapeRestructureActions = useLandscapeRestructureStore(
    useShallow((state) => ({
      setCommunicationSourceClass: state.setCommunicationSourceClass,
      setCommunicationTargetClass: state.setCommunicationTargetClass,
      setLandscapeData: state.setLandscapeData,
      resetLandscapeRestructure: state.resetLandscapeRestructure,
      addCommunication: state.addCommunication,
      resetClipboard: state.resetClipboard,
      addApplication: state.addApplication,
      undoBundledEntries: state.undoBundledEntries,
      undoEntry: state.undoEntry,
      toggleRestructureMode: state.toggleRestructureMode,
    }))
  );

  const changelogActions = useChangelogStore(
    useShallow((state) => ({
      getChangeLog: state.getChangeLog,
      isCreateBundle: state.isCreateBundle,
    }))
  );

  const changeLogEntries = useChangelogStore((state) => state.changeLogEntries);
  const isOnline = useCollaborationSessionStore((state) => state.isOnline);
  const authUser = useAuthStore((state) => state.user);
  const serializeRoom = useRoomSerializerStore((state) => state.serializeRoom);
  const getTimestampsForCommitId = useTimestampRepositoryStore(
    (state) => state.getTimestampsForCommitId
  );
  const getLocalUserCamera = useLocalUserStore((state) => state.getCamera);
  const saveSnapshot = useSnapshotTokenStore((state) => state.saveSnapshot);

  const {
    showInfoToastMessage,
    showSuccessToastMessage,
    showErrorToastMessage,
  } = useToastHandlerStore();

  const popupHandlerState = usePopupHandlerStore(
    useShallow((state) => ({
      popupData: state.popupData,
    }))
  );

  // MARK: Constants

  const today: string = useMemo(
    () => format(new Date().getTime() + 86400 * 1000, 'yyyy-MM-dd'),
    []
  );

  // MARK: State

  const [token, setToken] = useState<ApiToken | null>(() =>
    localStorage.getItem('gitAPIToken') !== null
      ? JSON.parse(localStorage.getItem('gitAPIToken')!)
      : null
  );
  const [issueURL, setIssueURL] = useState<string>(
    () => localStorage.getItem('gitIssue') || ''
  );
  const [uploadURL, setUploadURL] = useState<string>(
    () => localStorage.getItem('gitUpload') || ''
  );
  const [appName, setAppName] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  // const [clipboard, setClipboard] = useState<string>('');
  const [methodName, setMethodName] = useState<string>('');
  const [logTexts, setLogTexts] = useState<string[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [createAppBtnDisabled, setCreateAppBtnDisabled] =
    useState<boolean>(true);
  const [uploadIssueBtnDisabled, setUploadIssueBtnDisabled] =
    useState<boolean>(false);
  const [snapshotModal, setSnapshotModal] = useState<boolean>(false);
  const [index, setIndex] = useState<number | null>(null);
  const [snapshotName, setSnapshotName] = useState<string | null>(null);
  const [saveSnaphotBtnDisabled, setSaveSnaphotBtnDisabled] =
    useState<boolean>(true);
  const [expDate, setExpDate] = useState<number | null>(null);
  const [createPersonalSnapshot, setCreatePersonalSnapshot] =
    useState<boolean>(false);
  const [gitLabProjects, setGitLabProjects] = useState<GitlabProject[]>([]);
  const [project, setProject] = useState<GitlabProject | undefined>(() =>
    localStorage.getItem('gitProject') !== null
      ? JSON.parse(localStorage.getItem('gitProject')!)
      : undefined
  );
  const [saveCredBtnDisabled, setSaveCredBtnDisabled] = useState<boolean>(
    token !== null && project !== undefined ? false : true
  );

  // MARK: Event handlers

  const getActionColor = (index: number) => {
    const logEntry = changeLogEntries[index];
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
  };

  const toggleCheckBox = (index: number) => {
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
  };

  const toggleSelectAll = () => {
    const selectAllCheckbox = document.getElementById(
      'selectAll'
    ) as HTMLInputElement;
    const isChecked = selectAllCheckbox.checked;

    for (let i = 0; i < logTexts.length; i++) {
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
  };

  const addSelectedEntriesToIssue = (issueIndex: number) => {
    const issue = issues[issueIndex];
    let newContent = issue.content;

    for (let i = 0; i < logTexts.length; i++) {
      const checkbox = document.getElementById(
        'checkbox-' + i
      ) as HTMLInputElement;

      if (checkbox && checkbox.checked) {
        const entry = logTexts[i];
        newContent += `${entry}\n`;
      }
    }

    const updatedIssue = {
      ...issue,
      content: newContent,
    };

    setIssues((prev) =>
      prev.map((issue, index) => {
        if (index === issueIndex) return updatedIssue;
        return issue;
      })
    );
  };

  const toggleRestructureMode = () => {
    if (useLandscapeRestructureStore.getState().restructureMode) {
      if (isOnline()) removeTimestampListener();
      landscapeRestructureActions.setLandscapeData(landscapeData);

      if (!visualizationPaused) {
        toggleVisualizationUpdating();
      }

      showInfoToastMessage('Restructure Mode enabled');
    } else {
      if (visualizationPaused) {
        toggleVisualizationUpdating();
      }
      landscapeRestructureActions.resetLandscapeRestructure();
      showInfoToastMessage('Restructure Mode disabled');
    }
  };

  const canUpload = () => {
    const hasScreenshot = issues.some(
      (issue) => issue.screenshots && issue.screenshots.length > 0
    );
    if (hasScreenshot) {
      setUploadIssueBtnDisabled(uploadURL === '');
    } else {
      setUploadIssueBtnDisabled(false);
    }
  };

  const canSaveCredentials = () => {
    setSaveCredBtnDisabled(token === null || project === undefined);
    if (uploadURL) canUpload();
  };

  const canCreateApplication = () => {
    setCreateAppBtnDisabled(appName === '' || language === '');
  };

  const updateNewAppName = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    setAppName(target.value);
    canCreateApplication();
  };

  const updateLanguage = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    setLanguage(target.value);
    canCreateApplication();
  };

  const updateMethodName = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    setMethodName(target.value);
  };

  const updateToken = (updatedToken: ApiToken) => {
    if (JSON.stringify(updatedToken) !== JSON.stringify(token)) {
      setProject(undefined);
    }
    setToken(updatedToken);
    canSaveCredentials();
  };

  const onSelect = (project: GitlabProject) => {
    setProject(project);
    canSaveCredentials();
  };

  const loadProjects = () => {
    const body = { api_token: token!.token, host_url: token!.hostUrl };
    return new Promise<{ id: string; name: string }[]>((resolve) => {
      // fetch(`${gitlabApi}/get_all_projects/${token}/${hostUrl}`)
      fetch(`${gitlabApi}/get_all_projects`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
        .then(async (response: Response) => {
          console.log(response);
          if (response.ok) {
            const projects = (await response.json()) as {
              id: string;
              name: string;
            }[];
            setGitLabProjects(projects);
            resolve(projects);
          } else {
            showErrorToastMessage('Could not load projects.');
            setGitLabProjects([]);
            resolve([]);
          }
        })
        .catch(async (e) => {
          console.log(e);
          setGitLabProjects([]);
          resolve([]);
          showErrorToastMessage('Network error: Could not load projects.');
        });
    });
  };

  const updateIssueURL = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    setIssueURL(target.value);
    canSaveCredentials();
  };

  const updateUploadURL = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    setUploadURL(target.value);
    canSaveCredentials();
  };

  const resetSourceClass = () => {
    landscapeRestructureActions.setCommunicationSourceClass(null);
  };

  const resetTargetClass = () => {
    landscapeRestructureActions.setCommunicationTargetClass(null);
  };

  const createCommunication = () => {
    landscapeRestructureActions.addCommunication(methodName);
  };

  const addFoundation = () => {
    landscapeRestructureActions.addApplication(appName, language);
  };

  const showChangelog = () => {
    setLogTexts(changelogActions.getChangeLog());
  };

  const createIssue = () => {
    setIssues((prev) => [...prev, { title: '', content: '', screenshots: [] }]);
  };

  const updateIssueTitle = (
    indexToUpdate: number,
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const target = event.currentTarget as HTMLInputElement;
    setIssues((prev) =>
      prev.map((issue, index) =>
        index === indexToUpdate ? { ...issue, title: target.value } : issue
      )
    );
  };

  const updateIssueContent = (
    indexToUpdate: number,
    event: React.FormEvent<HTMLTextAreaElement>
  ) => {
    const target = event.currentTarget as HTMLTextAreaElement;
    setIssues((prev) =>
      prev.map((issue, index) =>
        index === indexToUpdate ? { ...issue, content: target.value } : issue
      )
    );
  };

  const addSnapshotLink = (
    indexToUpdate: number,
    url: string,
    name: string
  ) => {
    const updatedIssue = {
      ...issues[indexToUpdate],
      content: issues[indexToUpdate].content + '\n' + name + ': ' + url,
    };

    setIssues((prev) =>
      prev.map((issue, index) =>
        index === indexToUpdate ? updatedIssue : issue
      )
    );
  };

  const deleteIssue = (indexToUpdate: number) => {
    setIssues((prev) => prev.filter((issue, index) => index !== indexToUpdate));
  };

  const deleteScreenshot = (issueIndex: number, screenshotIndex: number) => {
    setIssues((prev) =>
      prev.map((issue, index) =>
        index === issueIndex
          ? {
              ...issue,
              screenshots: issue.screenshots.filter(
                (screenshot, screenshotIdx) => screenshotIdx !== screenshotIndex
              ),
            }
          : issue
      )
    );
    canUpload();
  };

  const screenshotCanvas = (indexToUpdate: number) => {
    const screenshotDataURL =
      landscapeRestructureState.canvas!.toDataURL('image/png');
    setIssues((prev) =>
      prev.map((issue, index) =>
        index === indexToUpdate
          ? {
              ...issue,
              screenshots: issue.screenshots.concat(screenshotDataURL),
            }
          : issue
      )
    );
    canUpload();
  };

  const openSnapshotModal = (index: number) => {
    setSnapshotModal(true);
    setIndex(index);
  };

  const closeSnapshotModal = () => {
    setSnapshotModal(false);
    setIndex(null);
    setSnapshotName(null);
    setExpDate(null);
    setSaveSnaphotBtnDisabled(true);
    setCreatePersonalSnapshot(false);
  };

  const updateName = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    setSnapshotName(target.value);
    canSaveSnapShot();
  };

  const canSaveSnapShot = () => {
    setSaveSnaphotBtnDisabled(snapshotName === '');
  };

  const updateExpDate = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget as HTMLInputElement;
    const date = convertDate(target.value);
    setExpDate(date);
  };

  const updatePersonalSnapshot = () => {
    setCreatePersonalSnapshot((prev) => !prev);
  };

  const createSnapshot = () => {
    const allAnnotations = annotationData.concat(minimizedAnnotations);

    const createdAt: number = new Date().getTime();
    const saveRoom = serializeRoom(
      popupHandlerState.popupData,
      allAnnotations,
      true
    );

    const timestamps = getTimestampsForCommitId(landscapeToken.value);
    const localUserCamera = getLocalUserCamera();

    const sharedToken: SnapshotToken = {
      owner: authUser!.sub,
      createdAt: createdAt,
      name: snapshotName!,
      landscapeToken: landscapeToken,
      structureData: {
        structureLandscapeData: landscapeData.structureLandscapeData,
        dynamicLandscapeData: landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      timestamps: { timestamps: timestamps },
      camera: {
        x: localUserCamera.position.x,
        y: localUserCamera.position.y,
        z: localUserCamera.position.z,
      },
      isShared: true,
      subscribedUsers: { subscriberList: [] },
      deleteAt: expDate !== null ? expDate : 0,
    };

    if (createPersonalSnapshot) {
      const personalToken: SnapshotToken = {
        ...sharedToken,
        isShared: false,
      };
      saveSnapshot(personalToken);
    }

    saveSnapshot(sharedToken);
    const snapshotURL = `${shareSnapshot}visualization?landscapeToken=${sharedToken.landscapeToken.value}&owner=${sharedToken.owner}&createdAt=${sharedToken.createdAt}&sharedSnapshot=${true}`;
    addSnapshotLink(index!, snapshotURL, sharedToken.name);
    closeSnapshotModal();
  };

  const deleteEntry = (index: number) => {
    const entry = changeLogEntries[index];
    const bundledCreateEntries = changelogActions
      .isCreateBundle(entry, [])
      ?.reverse();

    if (bundledCreateEntries?.length) {
      landscapeRestructureActions.undoBundledEntries(bundledCreateEntries);
    } else {
      landscapeRestructureActions.undoEntry(entry);
    }
  };

  const saveGitlabCredentials = () => {
    localStorage.setItem('gitAPIToken', JSON.stringify(token!));
    localStorage.setItem('gitProject', JSON.stringify(project!));
    // localStorage.setItem('gitUpload', this.uploadURL);
    showSuccessToastMessage('Git credentials successfully saved.');
  };

  const uploadImageToRepository = async (dataURL: string) => {
    const blob = await fetch(dataURL).then((res) => res.blob());
    const imgFile = new File([blob], 'screenshotCanvas.png', {
      type: 'image/png',
    });
    const formData = new FormData();

    formData.append('file', imgFile);

    const res = await fetch(
      // `https://${this.token!.hostUrl}/api/v4/projects/${this.project!.id}/uploads`,
      `${token!.hostUrl}/api/v4/projects/${project!.id}/uploads`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token!.token}`,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      showErrorToastMessage('Could not upload Image.');
    }

    const jsonRes = await res.json();
    return jsonRes.url;
  };

  const uploadIssueToGitLab = async (index: number) => {
    uploadImageToRepository(issues[index].screenshots[0]);

    const screenshotUrls = await Promise.all(
      issues[index].screenshots.map((screenshot) =>
        uploadImageToRepository(screenshot)
      )
    );

    const contentWithScreenShots = `${issues[index].content}\n${screenshotUrls
      .map((url) => `![Screenshot](${url})`)
      .join('\n')}`;

    const body = {
      project_id: project!.id,
      api_token: token!.token,
      host_url: token!.hostUrl,
      title: issues[index].title,
      description: contentWithScreenShots,
    };

    fetch(`${gitlabApi}/create_issue`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
      .then(async (response: Response) => {
        if (response.ok) {
          showSuccessToastMessage('Successfully created Issue.');
        } else {
          showErrorToastMessage('Could not load projects.');
        }
      })
      .catch(async () => {
        showErrorToastMessage('Network error: Could not load projects.');
      });
    deleteIssue(index);
  };

  // MARK: Effects

  useEffect(() => {
    eventEmitter.on('restructureMode', toggleRestructureMode);
    eventEmitter.on('showChangeLog', showChangelog);
    return () => {
      eventEmitter.off('restructureMode', toggleRestructureMode);
      eventEmitter.off('showChangeLog', showChangelog);
    };
  });

  // MARK: JSX

  return (
    <>
      <div>
        <h6 className="mb-3 mt-3">
          <strong>Restructure Mode</strong>
        </h6>
        <div className="ml-3">
          <div className="d-flex justify-content-between">
            <label>Enable Restructure Mode: </label>
            <WideCheckbox
              value={landscapeRestructureState.restructureMode}
              onToggle={landscapeRestructureActions.toggleRestructureMode}
            />
          </div>
        </div>

        {landscapeRestructureState.restructureMode && (
          <>
            <h6 className="mb-3 mt-3">
              <strong>Gitlab Credentials</strong>
            </h6>
            <div className="ml-3">
              <label htmlFor="token-select">API Token:</label>
              <div className="d-flex justify-content-between mr-2">
                <Select
                  className="form-control"
                  placeholder="Please select one API Token"
                  options={userApiTokens}
                  value={token}
                  onChange={(newValue) => {
                    if (newValue) updateToken(newValue);
                  }}
                  getOptionLabel={(token) => token.name}
                />
              </div>
              <ul></ul>
              <label htmlFor="token-select">GitLab Project:</label>
              <div className="mr-2">
                <AsyncSelect
                  className="form-control"
                  placeholder="Select Gitlab Project"
                  loadOptions={loadProjects}
                  value={project}
                  onChange={(newValue) => {
                    if (newValue) onSelect(newValue);
                  }}
                  isDisabled={token === null}
                  getOptionLabel={(project) => project.name}
                  cacheOptions
                />
              </div>
              {/* <ul></ul>
              <label htmlFor="issueURL">Gitlab Issue Link:</label>
              <div className="d-flex justify-content-between">
                <input
                  id="issueURL"
                  className="form-control mr-2"
                  onInput={updateIssueURL}
                  value={issueURL}
                />
              </div> */}
              <ul></ul>
              <div className="d-flex justify-content-between">
                <Button
                  title="Save Gitlab Credentials"
                  variant="outline-secondary"
                  onClick={saveGitlabCredentials}
                  disabled={saveCredBtnDisabled}
                >
                  Save
                </Button>
              </div>
            </div>

            <h6 className="mb-3 mt-3">
              <strong>Application</strong>
            </h6>
            <div className="ml-3">
              <label htmlFor="appName">Application name:</label>
              <div className="d-flex justify-content-between">
                <input
                  id="appName"
                  className="form-control mr-2"
                  onInput={updateNewAppName}
                  value={appName}
                />
              </div>
              <ul></ul>
              <label htmlFor="language">Language:</label>
              <div className="d-flex justify-content-between">
                <input
                  id="language"
                  className="form-control mr-2"
                  onInput={updateLanguage}
                  value={language}
                />
              </div>
              <ul></ul>
              <div className="d-flex justify-content-between">
                <Button
                  title="Create a new Application"
                  variant="outline-secondary"
                  onClick={addFoundation}
                  disabled={createAppBtnDisabled}
                >
                  Create Application
                </Button>
              </div>
            </div>

            <h6 className="mb-3 mt-3">
              <strong>Communication</strong>
            </h6>
            <div className="ml-3">
              <label htmlFor="methodName">Method name:</label>
              <div className="d-flex justify-content-between">
                <input
                  id="methodName"
                  className="form-control mr-2"
                  onInput={updateMethodName}
                  value={methodName}
                />
              </div>

              <ul></ul>
              <label htmlFor="srcClass">Source Class:</label>
              <div className="d-flex justify-content-between">
                <input
                  id="srcClass"
                  className="form-control mr-2"
                  value={landscapeRestructureState.sourceClass?.name}
                  disabled
                />
                <button
                  style={{ marginLeft: '5px' }}
                  type="button"
                  className="btn btn-danger"
                  title="Reset Source Class"
                  onClick={resetSourceClass}
                >
                  <TrashIcon size="small" className="align-right" />
                </button>
              </div>

              <ul></ul>
              <label htmlFor="targetClass">Target Class:</label>
              <div className="d-flex justify-content-between">
                <input
                  id="targetClass"
                  className="form-control mr-2"
                  value={landscapeRestructureState.targetClass?.name}
                  disabled
                />
                <button
                  style={{ marginLeft: '5px' }}
                  type="button"
                  className="btn btn-danger"
                  title="Reset Target Class"
                  onClick={resetTargetClass}
                >
                  <TrashIcon size="small" className="align-right" />
                </button>
              </div>

              <ul></ul>
              <div className="d-flex justify-content-between">
                <Button
                  title="Create Communication between Source and Target Class"
                  variant="outline-secondary"
                  onClick={createCommunication}
                >
                  Generate Communication
                </Button>
              </div>
            </div>

            <h6 className="mb-3 mt-3">
              <strong>Clipboard</strong>
            </h6>
            <div className="ml-3">
              <label htmlFor="clipboard"></label>
              <div className="d-flex justify-content-between">
                <input
                  id="clipboard"
                  className="form-control mr-2"
                  value={landscapeRestructureState.clipboard}
                  disabled
                />
                <button
                  type="button"
                  className="btn btn-danger"
                  title="Reset Clipboard"
                  onClick={landscapeRestructureActions.resetClipboard}
                >
                  <TrashIcon size="small" className="align-right" />
                </button>
              </div>
            </div>

            <h6 className="mb-3 mt-3">
              <strong>Changelog</strong>
            </h6>
            <div className="ml-3">
              <div
                className="d-flex flex-column justify-content-between"
                style={{ maxHeight: '600px', overflowY: 'auto' }}
              >
                <label htmlFor="changelog"></label>
                {logTexts.length && (
                  <>
                    <label htmlFor="selectAll"></label>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        value=""
                        id="selectAll"
                        onClick={toggleSelectAll}
                      />
                      <label className="form-check-label" htmlFor="selectAll">
                        Select All
                      </label>
                    </div>
                  </>
                )}
                {logTexts.map((entry, index) => (
                  <div
                    id={`card-${index}`}
                    className="card"
                    onClick={() => toggleCheckBox(index)}
                    style={{ cursor: 'pointer' }}
                    key={index}
                  >
                    <div className="card-body">
                      <div className="form-check position-relative" hidden>
                        <input
                          className="form-check-input position-absolute top-50 start-50 translate-middle"
                          type="checkbox"
                          value=""
                          id={`checkbox-${index}`}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`checkbox-${index}`}
                        ></label>
                      </div>
                      <p
                        className={getActionColor(index)}
                        style={{ userSelect: 'none' }}
                      >
                        #{index + 1}
                      </p>
                      <div className="d-flex justify-content-between align-items-center">
                        <p>{entry}</p>
                        <button
                          type="button"
                          style={{ padding: 0, margin: 0 }}
                          className="btn btn-sm link-secondary"
                          title="Delete Entry"
                          onClick={() => deleteEntry(index)}
                        >
                          <XIcon size="small" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h6 className="mb-3 mt-3">
              <strong>Gitlab</strong>
            </h6>
            {issues.map((issue, index) => (
              <React.Fragment key={index}>
                <div className="ml-3">
                  <div className="d-flex justify-content-between">
                    <label htmlFor="issueTitle"></label>
                    <input
                      id="issueTitle"
                      className="form-control mr-2"
                      type="text"
                      placeholder="Issue Title"
                      value={issue.title}
                      onInput={(event) => updateIssueTitle(index, event)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      title="Delete Issue"
                      onClick={() => deleteIssue(index)}
                    >
                      <XIcon size="small" className="align-right" />
                    </button>
                  </div>
                  <ul></ul>
                  <div className="d-flex flex-column justify-content-between">
                    <label htmlFor="issue"></label>
                    <textarea
                      id="issue"
                      placeholder="Issue Content"
                      rows={10}
                      value={issue.content}
                      onInput={(event) => updateIssueContent(index, event)}
                    ></textarea>
                    <button
                      type="button"
                      className="btn btn-sm"
                      title="Add Selected Entries"
                      onClick={() => addSelectedEntriesToIssue(index)}
                    >
                      Add Selected Entries
                    </button>
                  </div>
                  <ul></ul>
                  <div className="d-flex justify-content-between">
                    <button
                      type="button"
                      className="btn btn-light"
                      title="Take a Screenshot"
                      onClick={() => screenshotCanvas(index)}
                    >
                      <DeviceCameraIcon size="small" className="align-right" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-light"
                      title="Create Snapshot"
                      onClick={() => openSnapshotModal(index)}
                    >
                      <ImageIcon size="small" className="align-right" />
                    </button>
                  </div>
                  <ul></ul>
                  <ul>
                    {issue.screenshots.map((screenshot, screenshotIndex) => (
                      <li key={screenshotIndex}>
                        <button
                          type="button"
                          style={{ padding: 0, margin: 0 }}
                          className="btn btn-sm link-secondary"
                          title="Delete Screenshot"
                          onClick={() =>
                            deleteScreenshot(index, screenshotIndex)
                          }
                        >
                          <XIcon size="small" />
                        </button>
                        <span>Screenshot {screenshotIndex}</span>
                      </li>
                    ))}
                  </ul>
                  <ul></ul>
                  <Button
                    title="Upload Issue to Gitlab"
                    variant="outline-secondary"
                    onClick={() => uploadIssueToGitLab(index)}
                    disabled={saveCredBtnDisabled}
                  >
                    Upload to Gitlab
                  </Button>
                </div>
                <ul></ul>
              </React.Fragment>
            ))}
            <div className="ml-3 mt-2">
              <div className="d-flex justify-content-between mt-3">
                <Button
                  title="Create Issue"
                  variant="outline-secondary"
                  onClick={createIssue}
                >
                  Create Issue
                </Button>
              </div>
              <ul></ul>
            </div>
          </>
        )}
      </div>
      <div>
        <Modal show={snapshotModal} onHide={closeSnapshotModal}>
          <Modal.Header>
            <h4 className="modal-title">Create Snapshot</h4>
          </Modal.Header>
          <Modal.Body>
            <label htmlFor="name">Snapshot Name:</label>
            <div className="d-flex justify-content-between">
              <input
                id="name"
                className="form-control mr-2"
                onInput={updateName}
                value={snapshotName ?? undefined}
              />
            </div>
            <label className="mt-2" htmlFor="date">
              Expires <i>- Optional:</i>{' '}
            </label>
            <div className="d-flex justify-content-between">
              <input
                id="date"
                className="form-control mr-2"
                type="date"
                min={today}
                onInput={updateExpDate}
                // value={expDate ?? undefined}
              />
            </div>
            <div className="mt-2 d-flex">
              <div>
                <label className="mr-3" htmlFor="personalSnapshot">
                  Duplicate as Personal Snapshot:
                </label>
              </div>
              <div>
                <input
                  id="personalSnapshot"
                  type="checkbox"
                  onInput={updatePersonalSnapshot}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-danger" onClick={closeSnapshotModal}>
              Cancel
            </Button>
            <Button
              title="Save"
              variant="outline-secondary"
              onClick={createSnapshot}
              disabled={saveSnaphotBtnDisabled}
            >
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}
