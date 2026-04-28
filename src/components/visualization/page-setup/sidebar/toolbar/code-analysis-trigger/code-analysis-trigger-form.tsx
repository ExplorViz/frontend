import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';

const codeAgentUrl =
  import.meta.env.VITE_CODE_AGENT_URL || 'http://localhost:8078';

type InputOption = {
  label: string;
  value: string;
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

interface AnalysisRequest {
  repoPath?: string;
  repoRemoteUrl?: string;
  username?: string;
  password?: string;
  branch?: string;
  applicationRoot?: string;
  includeInAnalysisExpressions?: string;
  excludeFromAnalysisExpressions?: string;
  startCommit?: string;
  endCommit?: string;
  commitAnalysisLimit?: number;
  landscapeToken: string;
  applicationName: string;
  calculateMetrics: boolean;
  sendToRemote: boolean;
}

type Props = {
  landscapeToken?: string;
  onSubmitSuccess?: (landscapeToken: string) => void;
};

const getInitialFormData = (landscapeToken: string): AnalysisRequest => ({
  landscapeToken,
  repoRemoteUrl: '',
  repoPath: '',
  username: '',
  password: '',
  branch: '',
  applicationRoot: '',
  includeInAnalysisExpressions: '',
  excludeFromAnalysisExpressions: '',
  startCommit: '',
  endCommit: '',
  commitAnalysisLimit: 1,
  applicationName: '',
  calculateMetrics: true,
  sendToRemote: true,
});

export default function CodeAnalysisTriggerForm({
  landscapeToken,
  onSubmitSuccess,
}: Props) {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useLocalRepo, setUseLocalRepo] = useState(false);
  const [exclusionExpressions, setExclusionExpressions] = useState<
    readonly InputOption[]
  >([]);
  const [inclusionExpressions, setInclusionExpressions] = useState<
    readonly InputOption[]
  >([]);

  const landscapeTokenValue = useMemo(() => {
    return landscapeToken || searchParams.get('landscapeToken') || '';
  }, [searchParams, landscapeToken]);

  // form state
  const [formData, setFormData] = useState<AnalysisRequest>(() =>
    getInitialFormData(landscapeTokenValue)
  );

  useEffect(() => {
    if (landscapeTokenValue) {
      setFormData((prev) => ({
        ...prev,
        landscapeToken: landscapeTokenValue,
      }));
    }
  }, [landscapeTokenValue]);

  const handleInputChange = (
    field: string,
    value: string | boolean | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validation
    if (!useLocalRepo && !formData.repoRemoteUrl) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Please provide a repository URL');
      return;
    }

    if (useLocalRepo && !formData.repoPath) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Please provide a local repository path');
      return;
    }

    setIsSubmitting(true);

    try {
      // preparing request body
      const requestBody: Partial<AnalysisRequest> = {
        landscapeToken: formData.landscapeToken || landscapeTokenValue || '',
        applicationName: formData.applicationName,
      };

      if (useLocalRepo && formData.repoPath) {
        requestBody.repoPath = formData.repoPath;
      } else if (formData.repoRemoteUrl) {
        requestBody.repoRemoteUrl = formData.repoRemoteUrl;
      }

      if (formData.username) {
        requestBody.username = formData.username;
      }
      if (formData.password) {
        requestBody.password = formData.password;
      }
      if (formData.branch) {
        requestBody.branch = formData.branch;
      }
      if (formData.applicationRoot) {
        requestBody.applicationRoot = formData.applicationRoot;
      }
      if (inclusionExpressions.length > 0) {
        requestBody.includeInAnalysisExpressions = inclusionExpressions
          .map((opt) => opt.value)
          .join(',');
      }
      if (formData.startCommit) {
        requestBody.startCommit = formData.startCommit;
      }
      if (formData.endCommit) {
        requestBody.endCommit = formData.endCommit;
      }
      if (
        formData.commitAnalysisLimit !== undefined &&
        formData.commitAnalysisLimit > 0
      ) {
        requestBody.commitAnalysisLimit = formData.commitAnalysisLimit;
      }
      if (exclusionExpressions.length > 0) {
        requestBody.excludeFromAnalysisExpressions = exclusionExpressions
          .map((opt) => opt.value)
          .join(',');
      }

      requestBody.calculateMetrics = formData.calculateMetrics;
      requestBody.sendToRemote = formData.sendToRemote;

      const response = await fetch(`${codeAgentUrl}/api/analysis/trigger`, {
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

        // Reset form
        setFormData(getInitialFormData(landscapeTokenValue));
        setInclusionExpressions([]);
        setExclusionExpressions([]);

        onSubmitSuccess?.(formData.landscapeToken);
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
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="use-local-repo"
            label="Use Local Repository"
            checked={useLocalRepo}
            onChange={(e) => setUseLocalRepo(e.target.checked)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Landscape Token</Form.Label>
          <Form.Control
            type="text"
            placeholder="Landscape token"
            value={formData.landscapeToken}
            onChange={(e) =>
              handleInputChange('landscapeToken', e.target.value)
            }
            readOnly={!!landscapeTokenValue}
          />
          <Form.Text className="text-muted">
            {landscapeTokenValue
              ? 'Using current landscape token'
              : 'No landscape token selected'}
          </Form.Text>
        </Form.Group>

        {useLocalRepo ? (
          <Form.Group className="mb-3">
            <Form.Label>Local Repository Path *</Form.Label>
            <Form.Control
              type="text"
              placeholder="/path/to/local/repository"
              value={formData.repoPath}
              onChange={(e) => handleInputChange('repoPath', e.target.value)}
            />
          </Form.Group>
        ) : (
          <Form.Group className="mb-3">
            <Form.Label>Repository URL *</Form.Label>
            <Form.Control
              type="text"
              placeholder="https://github.com/user/repository"
              value={formData.repoRemoteUrl}
              onChange={(e) =>
                handleInputChange('repoRemoteUrl', e.target.value)
              }
            />
          </Form.Group>
        )}

        {!useLocalRepo && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Username (for private repos)</Form.Label>
              <Form.Control
                type="text"
                placeholder="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password/Token (for private repos)</Form.Label>
              <Form.Control
                type="password"
                placeholder="password or access token"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </Form.Group>
          </>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Application Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="default-application-name"
            value={formData.applicationName}
            onChange={(e) =>
              handleInputChange('applicationName', e.target.value)
            }
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Branch</Form.Label>
          <Form.Control
            type="text"
            placeholder="default-branch"
            value={formData.branch}
            onChange={(e) => handleInputChange('branch', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Application Root</Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g. app/src (Project root relative to repository root)"
            value={formData.applicationRoot}
            onChange={(e) =>
              handleInputChange('applicationRoot', e.target.value)
            }
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Inclusion Search Expressions</Form.Label>
          <CreatableSelect<InputOption, true>
            isMulti
            options={EXAMPLE_INCLUSION_EXPRESSIONS}
            value={inclusionExpressions}
            onChange={(newValue) => setInclusionExpressions(newValue)}
            getNewOptionData={(inputValue) => ({
              value: inputValue,
              label: inputValue,
            })}
            placeholder="Include all if empty (e.g. src/main/java/**)"
            noOptionsMessage={() => 'Type an expression or select a default...'}
          />
          <Form.Text className="text-muted">
            Limit the analysis to specific folders or files using glob patterns.
            If empty, all files will be included.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Exclusion Search Expressions</Form.Label>
          <CreatableSelect<InputOption, true>
            isMulti
            options={EXAMPLE_EXCLUSION_EXPRESSIONS}
            value={exclusionExpressions}
            onChange={(newValue) => setExclusionExpressions(newValue)}
            getNewOptionData={(inputValue) => ({
              value: inputValue,
              label: inputValue,
            })}
            placeholder="Select or type to add expressions..."
            noOptionsMessage={() => 'Type an expression or select a default...'}
          />
          <Form.Text className="text-muted">
            Exclude files or folders using glob patterns (e.g.,
            **/node_modules/**). If empty, no files will be excluded.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Analyze Commit Count</Form.Label>
          <Form.Control
            type="number"
            min={1}
            placeholder="Leave empty for all commits"
            value={formData.commitAnalysisLimit}
            onChange={(e) =>
              handleInputChange(
                'commitAnalysisLimit',
                e.target.value === '' ? undefined : parseInt(e.target.value, 10)
              )
            }
          />
        </Form.Group>

        <div className="mb-3 d-flex gap-4">
          <Form.Group>
            <Form.Check
              type="switch"
              id="calculate-metrics"
              label="Calculate Metrics"
              checked={formData.calculateMetrics}
              onChange={(e) =>
                handleInputChange('calculateMetrics', e.target.checked)
              }
            />
          </Form.Group>

          <Form.Group>
            <Form.Check
              type="switch"
              id="send-to-remote"
              label="Send Results via gRPC"
              checked={formData.sendToRemote}
              onChange={(e) =>
                handleInputChange('sendToRemote', e.target.checked)
              }
            />
          </Form.Group>
        </div>

        <div className="mb-3">
          <h6>Commit Range (Optional)</h6>

          <Form.Group className="mb-3">
            <Form.Label>Start Commit SHA</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. abc123def456..."
              value={formData.startCommit}
              onChange={(e) => handleInputChange('startCommit', e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>End Commit SHA</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. xyz789uvw012..."
              value={formData.endCommit}
              onChange={(e) => handleInputChange('endCommit', e.target.value)}
            />
          </Form.Group>
        </div>

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
              'Trigger Analysis'
            )}
          </button>
        </div>
      </Form>
    </div>
  );
}
