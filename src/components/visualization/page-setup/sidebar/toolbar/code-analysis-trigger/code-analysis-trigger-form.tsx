import React, { useState, useEffect } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';

const codeAgentUrl = import.meta.env.VITE_CODE_AGENT_URL || 'http://localhost:8090';

interface AnalysisRequest {
  repoPath?: string;
  repoRemoteUrl?: string;
  remoteStoragePath?: string;
  username?: string;
  password?: string;
  branch?: string;
  sourceDirectory?: string;
  restrictAnalysisToFolders?: string;
  startCommit?: string;
  endCommit?: string;
  landscapeToken: string;
  applicationName: string;
}

export default function CodeAnalysisTriggerForm() {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useLocalRepo, setUseLocalRepo] = useState(false);

  const landscapeTokenValue = searchParams.get('landscapeToken')

  console.log({
    landscapeTokenValue,
  });

  // form state
  const [formData, setFormData] = useState<AnalysisRequest>({
    repoRemoteUrl: '',
    repoPath: '',
    username: '',
    password: '',
    branch: '',
    sourceDirectory: '',
    restrictAnalysisToFolders: '',  
    startCommit: '',
    endCommit: '',
    landscapeToken: '',
    applicationName: '',
  });

  useEffect(() => {
    if (landscapeTokenValue) {
      setFormData((prev) => ({
        ...prev,
        landscapeToken: landscapeTokenValue,
      }));
    }
  }, [landscapeTokenValue]);

  const handleInputChange = (field: string, value: string | boolean) => {
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

    if (!formData.applicationName) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Please provide an application name');
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

      if (formData.remoteStoragePath) {
        requestBody.remoteStoragePath = formData.remoteStoragePath;
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
      if (formData.sourceDirectory) {
        requestBody.sourceDirectory = formData.sourceDirectory;
      }
      if (formData.restrictAnalysisToFolders) {
        requestBody.restrictAnalysisToFolders = formData.restrictAnalysisToFolders;
      }
      if (formData.startCommit) {
        requestBody.startCommit = formData.startCommit;
      }
      if (formData.endCommit) {
        requestBody.endCommit = formData.endCommit;
      }

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
          .showSuccessToastMessage(message || 'Analysis triggered successfully');
        
        // Reset form
        setFormData({
          repoRemoteUrl: '',
          repoPath: '',
          remoteStoragePath: '',
          username: '',
          password: '',
          branch: '',
          sourceDirectory: '',
          restrictAnalysisToFolders: '',
          startCommit: '',
          endCommit: '',
          landscapeToken: landscapeTokenValue || '',
          applicationName: '',
        });
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
            onChange={(e) => handleInputChange('landscapeToken', e.target.value)}
            readOnly={!!landscapeTokenValue}
          />
          <Form.Text className="text-muted">
            {landscapeTokenValue ? 'Using current landscape token' : 'No landscape token selected'}
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
              onChange={(e) => handleInputChange('repoRemoteUrl', e.target.value)}
            />
          </Form.Group>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Application Name *</Form.Label>
          <Form.Control
            type="text"
            placeholder="my-application"
            value={formData.applicationName}
            onChange={(e) => handleInputChange('applicationName', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Branch</Form.Label>
          <Form.Control
            type="text"
            placeholder="master"
            value={formData.branch}
            onChange={(e) => handleInputChange('branch', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Source Directory</Form.Label>
          <Form.Control
            type="text"
            placeholder="src/main/java"
            value={formData.sourceDirectory}
            onChange={(e) => handleInputChange('sourceDirectory', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Restrict Analysis To Folders</Form.Label>
          <Form.Control
            type="text"
            placeholder="src/main/java"
            value={formData.restrictAnalysisToFolders}
            onChange={(e) => handleInputChange('restrictAnalysisToFolders', e.target.value)}
          />
        </Form.Group>

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

        <div className="mb-3">
          <h6>Commit Range (Optional)</h6>
          
          <Form.Group className="mb-3">
            <Form.Label>Start Commit SHA</Form.Label>
            <Form.Control
              type="text"
              placeholder="abc123def456..."
              value={formData.startCommit}
              onChange={(e) => handleInputChange('startCommit', e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>End Commit SHA</Form.Label>
            <Form.Control
              type="text"
              placeholder="xyz789uvw012..."
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