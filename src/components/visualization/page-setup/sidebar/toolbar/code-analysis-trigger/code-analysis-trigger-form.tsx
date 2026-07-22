import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { getCodeAnalyzerUrl } from 'explorviz-frontend/src/utils/code-analyzer-url';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';

const codeAnalyzerUrl = getCodeAnalyzerUrl();

type InputOption = {
  label: string;
  value: string;
};

type ApplicationSpec = {
  name: string;
  root: string;
};

type LocalRepositoryInfo = {
  path: string;
  branches: string[];
};

type RepoType = 'remote' | 'local';

type CommitSamplingPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

interface AnalysisRequestPayload {
  repoPath?: string;
  repoRemoteUrl?: string;
  username?: string;
  password?: string;
  branch?: string;
  includeInAnalysisExpressions?: string;
  excludeFromAnalysisExpressions?: string;
  startCommit?: string;
  endCommit?: string;
  commitAnalysisLimit?: number;
  commitSamplingInterval?: number;
  commitSamplingPeriod?: CommitSamplingPeriod;
  maxLocForFullAnalysis?: number;
  firstParentCommitsOnly: boolean;
  landscapeToken: string;
  applications?: ApplicationSpec[];
  includeDataStructures: boolean;
  sendToRemote: boolean;
  fetchSocialData: boolean;
  fetchEndDate?: string;
  socialDataTimeFrameDays?: number;
}

type Props = {
  landscapeToken?: string;
  assignRandomToken?: boolean;
  onSubmitSuccess?: (landscapeToken: string) => void;
};

const EXAMPLE_INCLUSION_EXPRESSIONS: InputOption[] = [
  { value: 'src/main/java/**', label: 'src/main/java/**' },
  { value: 'src/main/kotlin/**', label: 'src/main/kotlin/**' },
  { value: 'regex:.*Model\\.java', label: 'regex:.*Model\\.java' },
  { value: 'src/**/*.ts', label: 'src/**/*.ts' },
  { value: 'src/**/*.tsx', label: 'src/**/*.tsx' },
  { value: 'src/**/*.cpp', label: 'src/**/*.cpp' },
];

const EXAMPLE_EXCLUSION_EXPRESSIONS: InputOption[] = [
  { value: '**/*.min.js', label: '**/*.min.js' },
  { value: '**/*.bundle.js', label: '**/*.bundle.js' },
  { value: '**/*.chunk.js', label: '**/*.chunk.js' },
  { value: '**/*.d.ts', label: '**/*.d.ts' },
  { value: '**/node_modules/**', label: '**/node_modules/**' },
  { value: '**/dist/**', label: '**/dist/**' },
  { value: '**/target/**', label: '**/target/**' },
  { value: '**/build/**', label: '**/build/**' },
  { value: '**/bin/**', label: '**/bin/**' },
  { value: 'regex:.*Test\\.java', label: 'regex:.*Test\\.java' },
];

const FILTER_EXAMPLES = [
  {
    expression: 'src/main/java/**',
    description: 'Matches all files and subdirectories under src/main/java.',
  },
  {
    expression: '**/*.java,**/*.kt',
    description: 'Matches every .java or .kt file.',
  },
  {
    expression: 'some/*/*/path/**',
    description:
      'Matches files in paths with exactly 2 directory levels between some and path.',
  },
  {
    expression: '**/target/**',
    description:
      'Matches any target folder and its contents (may be useful for exclusion).',
  },
  {
    expression: 'regex:.*Test\\.java',
    description:
      'Regular expression that matches all Java test files (ending in Test.java) anywhere.',
  },
];

const createApplicationRow = (): ApplicationSpec => ({ name: '', root: '' });

function FormLabelWithHelp({ label, help }: { label: string; help: string }) {
  return (
    <Form.Label className="d-flex align-items-center mb-1">
      {label}
      <HelpTooltip title={help} placement="top" />
    </Form.Label>
  );
}

function buildPayload(
  repoType: RepoType,
  formData: Omit<
    AnalysisRequestPayload,
    | 'includeDataStructures'
    | 'sendToRemote'
    | 'fetchSocialData'
    | 'firstParentCommitsOnly'
  > & {
    includeDataStructures: boolean;
    sendToRemote: boolean;
    fetchSocialData: boolean;
    firstParentCommitsOnly: boolean;
  },
  inclusionExpressions: readonly InputOption[],
  exclusionExpressions: readonly InputOption[],
  applications: ApplicationSpec[]
): Partial<AnalysisRequestPayload> {
  const payload: Partial<AnalysisRequestPayload> = {
    includeDataStructures: formData.includeDataStructures,
    sendToRemote: formData.sendToRemote,
    fetchSocialData: formData.fetchSocialData,
    firstParentCommitsOnly: formData.firstParentCommitsOnly,
  };

  const landscapeToken = formData.landscapeToken.trim();
  if (landscapeToken) {
    payload.landscapeToken = landscapeToken;
  }

  if (repoType === 'local' && formData.repoPath?.trim()) {
    payload.repoPath = formData.repoPath.trim();
  } else if (repoType === 'remote' && formData.repoRemoteUrl?.trim()) {
    payload.repoRemoteUrl = formData.repoRemoteUrl.trim();
  }

  if (formData.username?.trim()) {
    payload.username = formData.username.trim();
  }
  if (formData.password?.trim()) {
    payload.password = formData.password.trim();
  }
  if (formData.branch?.trim()) {
    payload.branch = formData.branch.trim();
  }
  if (formData.startCommit?.trim()) {
    payload.startCommit = formData.startCommit.trim();
  }
  if (formData.endCommit?.trim()) {
    payload.endCommit = formData.endCommit.trim();
  }
  if (formData.fetchEndDate?.trim()) {
    payload.fetchEndDate = formData.fetchEndDate.trim();
  }

  if (
    formData.commitAnalysisLimit !== undefined &&
    formData.commitAnalysisLimit > 0
  ) {
    payload.commitAnalysisLimit = formData.commitAnalysisLimit;
  }
  if (
    formData.maxLocForFullAnalysis !== undefined &&
    formData.maxLocForFullAnalysis > 0
  ) {
    payload.maxLocForFullAnalysis = formData.maxLocForFullAnalysis;
  }
  if (
    formData.socialDataTimeFrameDays !== undefined &&
    formData.socialDataTimeFrameDays > 0
  ) {
    payload.socialDataTimeFrameDays = formData.socialDataTimeFrameDays;
  }
  if (
    formData.commitSamplingInterval !== undefined &&
    formData.commitSamplingInterval > 1
  ) {
    payload.commitSamplingInterval = formData.commitSamplingInterval;
  }
  if (formData.commitSamplingPeriod) {
    payload.commitSamplingPeriod = formData.commitSamplingPeriod;
  }

  if (inclusionExpressions.length > 0) {
    payload.includeInAnalysisExpressions = inclusionExpressions
      .map((opt) => opt.value)
      .join(',');
  }
  if (exclusionExpressions.length > 0) {
    payload.excludeFromAnalysisExpressions = exclusionExpressions
      .map((opt) => opt.value)
      .join(',');
  }

  const resolvedApplications = applications
    .map((app) => ({
      name: app.name.trim(),
      root: app.root.trim(),
    }))
    .filter((app) => app.name.length > 0);

  if (resolvedApplications.length > 0) {
    payload.applications = resolvedApplications;
  }

  return payload;
}

export default function CodeAnalysisTriggerForm({
  landscapeToken,
  assignRandomToken = false,
  onSubmitSuccess,
}: Props) {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repoType, setRepoType] = useState<RepoType>('remote');
  const [exclusionExpressions, setExclusionExpressions] = useState<
    readonly InputOption[]
  >([]);
  const [inclusionExpressions, setInclusionExpressions] = useState<
    readonly InputOption[]
  >([]);
  const [applications, setApplications] = useState<ApplicationSpec[]>([
    createApplicationRow(),
  ]);
  const [localRepositories, setLocalRepositories] = useState<
    LocalRepositoryInfo[]
  >([]);
  const [localRepositoriesLoading, setLocalRepositoriesLoading] =
    useState(false);
  const [localRepositoriesError, setLocalRepositoriesError] = useState<
    string | null
  >(null);

  const [generatedToken] = useState(() =>
    assignRandomToken ? generateUuidv4() : ''
  );

  const externalLandscapeToken = useMemo(() => {
    return landscapeToken || searchParams.get('landscapeToken') || '';
  }, [searchParams, landscapeToken]);

  const landscapeTokenValue = useMemo(() => {
    if (externalLandscapeToken) {
      return externalLandscapeToken;
    }
    if (assignRandomToken) {
      return generatedToken;
    }
    return '';
  }, [externalLandscapeToken, assignRandomToken, generatedToken]);

  const [formData, setFormData] = useState({
    landscapeToken: landscapeTokenValue,
    repoRemoteUrl: '',
    repoPath: '',
    username: '',
    password: '',
    branch: '',
    startCommit: '',
    endCommit: '',
    commitAnalysisLimit: 1 as number | undefined,
    commitSamplingInterval: undefined as number | undefined,
    commitSamplingPeriod: '' as CommitSamplingPeriod | '',
    maxLocForFullAnalysis: undefined as number | undefined,
    firstParentCommitsOnly: true,
    fetchEndDate: '',
    socialDataTimeFrameDays: undefined as number | undefined,
    includeDataStructures: true,
    sendToRemote: true,
    fetchSocialData: false,
  });

  useEffect(() => {
    if (landscapeTokenValue) {
      setFormData((prev) => ({
        ...prev,
        landscapeToken: landscapeTokenValue,
      }));
    }
  }, [landscapeTokenValue]);

  const selectedLocalRepository = useMemo(
    () =>
      localRepositories.find(
        (repository) => repository.path === formData.repoPath
      ),
    [localRepositories, formData.repoPath]
  );

  const payloadPreview = useMemo(
    () =>
      buildPayload(
        repoType,
        formData,
        inclusionExpressions,
        exclusionExpressions,
        applications
      ),
    [
      repoType,
      formData,
      inclusionExpressions,
      exclusionExpressions,
      applications,
    ]
  );

  const loadLocalRepositories = async () => {
    setLocalRepositoriesLoading(true);
    setLocalRepositoriesError(null);

    try {
      const response = await fetch(
        `${codeAnalyzerUrl}/api/analysis/local-repositories`
      );
      if (!response.ok) {
        throw new Error('Unable to load cloned repositories.');
      }

      const repositories = (await response.json()) as LocalRepositoryInfo[];
      setLocalRepositories(repositories);
    } catch (error: any) {
      setLocalRepositories([]);
      setLocalRepositoriesError(
        error.message || 'Unable to load cloned repositories.'
      );
    } finally {
      setLocalRepositoriesLoading(false);
    }
  };

  useEffect(() => {
    if (repoType === 'local') {
      loadLocalRepositories();
    }
  }, [repoType]);

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplicationChange = (
    index: number,
    field: keyof ApplicationSpec,
    value: string
  ) => {
    setApplications((prev) =>
      prev.map((application, currentIndex) =>
        currentIndex === index
          ? { ...application, [field]: value }
          : application
      )
    );
  };

  const addApplicationRow = () => {
    setApplications((prev) => [...prev, createApplicationRow()]);
  };

  const removeApplicationRow = (index: number) => {
    if (applications.length <= 1) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Keep at least one application row.');
      return;
    }
    setApplications((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const resetForm = () => {
    setFormData({
      landscapeToken: landscapeTokenValue,
      repoRemoteUrl: '',
      repoPath: '',
      username: '',
      password: '',
      branch: '',
      startCommit: '',
      endCommit: '',
      commitAnalysisLimit: 1,
      commitSamplingInterval: undefined,
      commitSamplingPeriod: '',
      maxLocForFullAnalysis: undefined,
      firstParentCommitsOnly: true,
      fetchEndDate: '',
      socialDataTimeFrameDays: undefined,
      includeDataStructures: true,
      sendToRemote: true,
      fetchSocialData: false,
    });
    setRepoType('remote');
    setInclusionExpressions([]);
    setExclusionExpressions([]);
    setApplications([createApplicationRow()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requestBody = buildPayload(
      repoType,
      formData,
      inclusionExpressions,
      exclusionExpressions,
      applications
    );

    if (!requestBody.repoPath && !requestBody.repoRemoteUrl) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage(
          'Provide either a local repository path or a remote URL.'
        );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${codeAnalyzerUrl}/api/analysis/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const message = await response.text();
        useToastHandlerStore
          .getState()
          .showSuccessToastMessage(
            message || 'Analysis triggered successfully'
          );

        resetForm();
        onSubmitSuccess?.(requestBody.landscapeToken || landscapeTokenValue);
      } else {
        const errorMessage = await response.text();
        useToastHandlerStore
          .getState()
          .showErrorToastMessage(`Analysis failed: ${errorMessage}`);
      }
    } catch (error: any) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage(
          `Failed to trigger analysis: ${error.message || 'Network error'}`
        );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="code-analysis-trigger-form p-3">
      <Form onSubmit={handleSubmit}>
        <section className="border rounded p-3 mb-3">
          <h6 className="mb-3">Repository</h6>

          <Form.Group className="mb-3">
            <div className="d-flex flex-wrap gap-3">
              <Form.Check
                type="radio"
                id="repo-type-remote"
                name="repoType"
                label={
                  <span className="d-inline-flex align-items-center">
                    Remote Repository
                    <HelpTooltip
                      title="Clone and analyze a repository from a remote URL."
                      placement="top"
                    />
                  </span>
                }
                checked={repoType === 'remote'}
                onChange={() => setRepoType('remote')}
              />
              <Form.Check
                type="radio"
                id="repo-type-local"
                name="repoType"
                label={
                  <span className="d-inline-flex align-items-center">
                    Local Repository
                    <HelpTooltip
                      title="Analyze a repository already present on the local file system."
                      placement="top"
                    />
                  </span>
                }
                checked={repoType === 'local'}
                onChange={() => setRepoType('local')}
              />
            </div>
          </Form.Group>

          {repoType === 'remote' ? (
            <>
              <Form.Group className="mb-3">
                <FormLabelWithHelp
                  label="Remote Repository URL (required)"
                  help="The URL of the Git repository to analyze. Supports HTTPS and SSH formats (e.g., git@github.com:org/project.git)."
                />
                <Form.Control
                  type="text"
                  placeholder="https://github.com/org/project.git or git@github.com:org/project.git"
                  value={formData.repoRemoteUrl}
                  onChange={(e) =>
                    handleInputChange('repoRemoteUrl', e.target.value)
                  }
                />
              </Form.Group>

              <div className="row">
                <Form.Group className="mb-3 col-md-6">
                  <FormLabelWithHelp
                    label="Username"
                    help="Optional: Username for authenticating with the remote repository."
                  />
                  <Form.Control
                    type="text"
                    autoComplete="username"
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange('username', e.target.value)
                    }
                  />
                </Form.Group>

                <Form.Group className="mb-3 col-md-6">
                  <FormLabelWithHelp
                    label="Password / Token"
                    help="Optional: Password or Personal Access Token for authentication."
                  />
                  <Form.Control
                    type="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange('password', e.target.value)
                    }
                  />
                </Form.Group>
              </div>
            </>
          ) : (
            <Form.Group className="mb-3">
              <FormLabelWithHelp
                label="Local Repository (required)"
                help="A repository below the local cloned-repositories folder. The selected value is submitted relative to that folder."
              />
              <Form.Select
                value={formData.repoPath}
                disabled={localRepositoriesLoading}
                onChange={(e) => {
                  handleInputChange('repoPath', e.target.value);
                  handleInputChange('branch', '');
                }}
              >
                <option value="">
                  {localRepositoriesLoading
                    ? 'Loading cloned repositories...'
                    : localRepositoriesError
                      ? localRepositoriesError
                      : localRepositories.length === 0
                        ? 'No cloned repositories found'
                        : 'Select a cloned repository'}
                </option>
                {localRepositories.map((repository) => (
                  <option key={repository.path} value={repository.path}>
                    {repository.path}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <FormLabelWithHelp
              label="Analyze Commit Count"
              help="Determines how many of the newest commits should be analyzed (remote and local)."
            />
            <Form.Control
              type="number"
              min={1}
              placeholder="all"
              value={formData.commitAnalysisLimit ?? ''}
              onChange={(e) =>
                handleInputChange(
                  'commitAnalysisLimit',
                  e.target.value === ''
                    ? undefined
                    : parseInt(e.target.value, 10)
                )
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="first-parent-commits-only"
              label={
                <span className="d-inline-flex align-items-center">
                  First-Parent Commits Only
                  <HelpTooltip
                    title="When enabled, only commits on the first-parent chain are analyzed. Commits from merged feature branches are excluded."
                    placement="top"
                  />
                </span>
              }
              checked={formData.firstParentCommitsOnly}
              onChange={(e) =>
                handleInputChange('firstParentCommitsOnly', e.target.checked)
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <FormLabelWithHelp
              label="Max LOC for Full Analysis"
              help="Optional limit on lines of code for full source analysis. Files with more lines are still included, but only programming language, LOC, and size are computed. Leave empty to analyze all files fully."
            />
            <Form.Control
              type="number"
              min={1}
              placeholder="all"
              value={formData.maxLocForFullAnalysis ?? ''}
              onChange={(e) =>
                handleInputChange(
                  'maxLocForFullAnalysis',
                  e.target.value === ''
                    ? undefined
                    : parseInt(e.target.value, 10)
                )
              }
            />
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-3 col-md-6">
              <FormLabelWithHelp
                label="Branch"
                help={
                  repoType === 'remote'
                    ? "The branch to analyze. Uses default branch if none is given (usually 'main' or 'master')."
                    : 'The branch to analyze from the selected local repository. Uses the current branch if none is selected.'
                }
              />
              {repoType === 'remote' ? (
                <Form.Control
                  type="text"
                  placeholder="default"
                  value={formData.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                />
              ) : (
                <Form.Select
                  value={formData.branch}
                  disabled={!selectedLocalRepository}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                >
                  <option value="">
                    {!selectedLocalRepository
                      ? 'Select a repository first'
                      : selectedLocalRepository.branches.length === 0
                        ? 'No branches found'
                        : 'Use current branch'}
                  </option>
                  {selectedLocalRepository?.branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <FormLabelWithHelp
                label="Start Commit"
                help="Optional: The hash of the commit where the analysis should start."
              />
              <Form.Control
                type="text"
                placeholder="Oldest Commit"
                value={formData.startCommit}
                onChange={(e) =>
                  handleInputChange('startCommit', e.target.value)
                }
              />
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <FormLabelWithHelp
                label="End Commit"
                help="Optional: The hash of the commit where the analysis should end."
              />
              <Form.Control
                type="text"
                placeholder="Newest Commit"
                value={formData.endCommit}
                onChange={(e) => handleInputChange('endCommit', e.target.value)}
              />
            </Form.Group>
          </div>
        </section>

        <section className="border rounded p-3 mb-3">
          <h6 className="mb-3">Filters</h6>

          <Form.Group className="mb-3">
            <FormLabelWithHelp
              label="Inclusion Search Expressions"
              help="Limit the analysis to specific subdirectories or files within the repository using a comma-separated list of search expressions relative to the repository root. If empty, all files will be included."
            />
            <CreatableSelect<InputOption, true>
              isMulti
              options={EXAMPLE_INCLUSION_EXPRESSIONS}
              value={inclusionExpressions}
              onChange={(newValue) => setInclusionExpressions(newValue)}
              getNewOptionData={(inputValue) => ({
                value: inputValue,
                label: inputValue,
              })}
              placeholder="Include all"
              noOptionsMessage={() =>
                'Type an expression or select a default...'
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <FormLabelWithHelp
              label="Exclusion Search Expressions"
              help="Exclude specific subdirectories or files from the analysis using a comma-separated list of search expressions relative to the repository root. If empty, no files will be excluded."
            />
            <CreatableSelect<InputOption, true>
              isMulti
              options={EXAMPLE_EXCLUSION_EXPRESSIONS}
              value={exclusionExpressions}
              onChange={(newValue) => setExclusionExpressions(newValue)}
              getNewOptionData={(inputValue) => ({
                value: inputValue,
                label: inputValue,
              })}
              placeholder="Exclude none"
              noOptionsMessage={() =>
                'Type an expression or select a default...'
              }
            />
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-3 col-md-6">
              <FormLabelWithHelp
                label="Commit Sampling Interval"
                help="Analyze every Nth commit (e.g. 5 = commits 1, 6, 11, …). All commits are still stored in the history; only sampled commits receive full file analysis. Leave empty to disable interval sampling."
              />
              <Form.Control
                type="number"
                min={2}
                placeholder="disabled"
                value={formData.commitSamplingInterval ?? ''}
                disabled={!!formData.commitSamplingPeriod}
                onChange={(e) =>
                  handleInputChange(
                    'commitSamplingInterval',
                    e.target.value === ''
                      ? undefined
                      : parseInt(e.target.value, 10)
                  )
                }
              />
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <FormLabelWithHelp
                label="Commit Sampling Period"
                help="Alternative to interval sampling: analyze the first commit in each day, week, month, or year. All other commits are stored as metadata-only entries."
              />
              <Form.Select
                value={formData.commitSamplingPeriod}
                disabled={
                  formData.commitSamplingInterval != null &&
                  formData.commitSamplingInterval > 1
                }
                onChange={(e) =>
                  handleInputChange(
                    'commitSamplingPeriod',
                    e.target.value as CommitSamplingPeriod | ''
                  )
                }
              >
                <option value="">disabled</option>
                <option value="DAY">Day</option>
                <option value="WEEK">Week</option>
                <option value="MONTH">Month</option>
                <option value="YEAR">Year</option>
              </Form.Select>
            </Form.Group>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0">
              <thead>
                <tr>
                  <th>Example Expression</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {FILTER_EXAMPLES.map((example) => (
                  <tr key={example.expression}>
                    <td>
                      <code>{example.expression}</code>
                    </td>
                    <td>{example.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border rounded p-3 mb-3">
          <h6 className="mb-3">Analysis Configuration</h6>

          <div className="mb-3">
            <FormLabelWithHelp
              label="Applications"
              help="One or more logical applications: each has a name and an optional project root path relative to the repository root. Use multiple rows for monorepos."
            />
            {applications.map((application, index) => (
              <div
                key={`application-row-${index}`}
                className="border rounded p-2 mb-2"
              >
                <div className="row g-2 align-items-end">
                  <Form.Group className="col-md-5">
                    <Form.Label className="mb-1">Application name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g. order-service"
                      value={application.name}
                      onChange={(e) =>
                        handleApplicationChange(index, 'name', e.target.value)
                      }
                    />
                  </Form.Group>
                  <Form.Group className="col-md-5">
                    <Form.Label className="mb-1">Application root</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="relative to repo root, optional"
                      value={application.root}
                      onChange={(e) =>
                        handleApplicationChange(index, 'root', e.target.value)
                      }
                    />
                  </Form.Group>
                  <Form.Group className="col-md-2">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="sm"
                      className="w-100"
                      onClick={() => removeApplicationRow(index)}
                    >
                      Remove
                    </Button>
                  </Form.Group>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline-primary"
              size="sm"
              onClick={addApplicationRow}
            >
              Add application
            </Button>
          </div>

          <Form.Group className="mb-3">
            <FormLabelWithHelp
              label="Landscape Token"
              help="The landscape token for the ExplorViz software landscape."
            />
            <Form.Control
              type={externalLandscapeToken ? 'text' : 'password'}
              placeholder="mytokenvalue"
              value={formData.landscapeToken}
              onChange={(e) =>
                handleInputChange('landscapeToken', e.target.value)
              }
              readOnly={!!externalLandscapeToken}
            />
            <Form.Text className="text-muted">
              {externalLandscapeToken
                ? 'Using current landscape token'
                : assignRandomToken
                  ? 'A random landscape token was generated for this analysis'
                  : 'No landscape token selected'}
            </Form.Text>
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-3 col-md-6">
              <FormLabelWithHelp
                label="Social Fetch End Date"
                help="Optional: Date to end fetching social data (e.g. 2026-05-10 or ISO timestamp)."
              />
              <Form.Control
                type="text"
                placeholder="current date"
                value={formData.fetchEndDate}
                onChange={(e) =>
                  handleInputChange('fetchEndDate', e.target.value)
                }
              />
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <FormLabelWithHelp
                label="Social Fetch Time Frame"
                help="How many days in the past social data will be fetched."
              />
              <Form.Control
                type="number"
                min={1}
                placeholder="365"
                value={formData.socialDataTimeFrameDays ?? ''}
                onChange={(e) =>
                  handleInputChange(
                    'socialDataTimeFrameDays',
                    e.target.value === ''
                      ? undefined
                      : parseInt(e.target.value, 10)
                  )
                }
              />
            </Form.Group>
          </div>

          <div className="d-flex flex-wrap gap-3 mb-3">
            <Form.Check
              type="checkbox"
              id="include-data-structures"
              label={
                <span className="d-inline-flex align-items-center">
                  Include Data Structures
                  <HelpTooltip
                    title="Whether to include classes, functions, and parameters in exported file data. Metrics are always computed; when disabled, only file-level metadata and metrics are sent."
                    placement="top"
                  />
                </span>
              }
              checked={formData.includeDataStructures}
              onChange={(e) =>
                handleInputChange('includeDataStructures', e.target.checked)
              }
            />
            <Form.Check
              type="checkbox"
              id="send-to-remote"
              label={
                <span className="d-inline-flex align-items-center">
                  Send Results via gRPC
                  <HelpTooltip
                    title="Whether to push the analysis results to the landscape-service."
                    placement="top"
                  />
                </span>
              }
              checked={formData.sendToRemote}
              onChange={(e) =>
                handleInputChange('sendToRemote', e.target.checked)
              }
            />
            <Form.Check
              type="checkbox"
              id="fetch-social-data"
              label={
                <span className="d-inline-flex align-items-center">
                  Fetch Social Data
                  <HelpTooltip
                    title="Whether to fetch social data."
                    placement="top"
                  />
                </span>
              }
              checked={formData.fetchSocialData}
              onChange={(e) =>
                handleInputChange('fetchSocialData', e.target.checked)
              }
            />
          </div>
        </section>

        <details className="border rounded p-3 mb-3">
          <summary className="fw-semibold">Payload Preview (read-only)</summary>
          <pre className="mt-3 mb-0 small bg-light p-2 rounded">
            {JSON.stringify(payloadPreview, null, 2)}
          </pre>
        </details>

        <div className="d-flex justify-content-end">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Analyzing...
              </>
            ) : (
              'Run Analysis'
            )}
          </button>
        </div>
      </Form>
    </div>
  );
}
