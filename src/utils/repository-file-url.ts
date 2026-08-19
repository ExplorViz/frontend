import {
  Commit,
  CROSS_COMMIT_IDENTIFIER,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';

const HOST_FILE_URL_COMMIT_PATTERN = /(\/(?:-\/blob|blob|src)\/)([^/]+)(\/)/;

type GitHost = 'github' | 'gitlab' | 'bitbucket' | 'unknown';

function normalizeRepositoryUrl(
  repositoryUrl: string | undefined
): string | undefined {
  if (!repositoryUrl?.trim()) {
    return undefined;
  }

  return repositoryUrl.endsWith('.git')
    ? repositoryUrl.slice(0, -4)
    : repositoryUrl;
}

function getGitHost(repositoryUrl: string): GitHost {
  try {
    const host = new URL(repositoryUrl).host.toLowerCase();
    if (host.includes('github.com')) {
      return 'github';
    }
    if (host.includes('gitlab')) {
      return 'gitlab';
    }
    if (host.includes('bitbucket.org')) {
      return 'bitbucket';
    }
  } catch {
    return 'unknown';
  }

  return 'unknown';
}

function isValidCommitHash(commitId: string): boolean {
  return commitId.length > 0 && commitId !== CROSS_COMMIT_IDENTIFIER;
}

export function fqnToRepositoryPath(
  fqn: string | undefined,
  repositoryName: string | undefined
): string | undefined {
  if (!fqn?.trim()) {
    return undefined;
  }

  const normalizedFqn = fqn.replace(/\\/g, '/');
  if (
    repositoryName?.trim() &&
    normalizedFqn.startsWith(`${repositoryName}/`)
  ) {
    return normalizedFqn.substring(repositoryName.length + 1);
  }

  return normalizedFqn;
}

function buildTreeUrlForHost(
  repositoryUrl: string,
  commitSha: string,
  directoryPath?: string
): string | undefined {
  const normalizedDirectoryPath = directoryPath?.replace(/\\/g, '/').trim();
  const pathSuffix =
    normalizedDirectoryPath && normalizedDirectoryPath.length > 0
      ? `/${normalizedDirectoryPath}`
      : '';

  switch (getGitHost(repositoryUrl)) {
    case 'github':
      return `${repositoryUrl}/tree/${commitSha}${pathSuffix}`;
    case 'gitlab':
      return `${repositoryUrl}/-/tree/${commitSha}${pathSuffix}`;
    case 'bitbucket':
      return `${repositoryUrl}/src/${commitSha}${pathSuffix}`;
    default:
      return undefined;
  }
}

export function buildRepositoryTreeUrl(
  remoteUrl: string | undefined,
  commitHash: string | undefined
): string | undefined {
  const repositoryUrl = normalizeRepositoryUrl(remoteUrl);
  if (!repositoryUrl || !commitHash || !isValidCommitHash(commitHash)) {
    return undefined;
  }

  return buildTreeUrlForHost(repositoryUrl, commitHash);
}

export function buildDirectoryTreeUrl(
  remoteUrl: string | undefined,
  commitHash: string | undefined,
  fqn: string | undefined,
  repositoryName: string | undefined
): string | undefined {
  const repositoryUrl = normalizeRepositoryUrl(remoteUrl);
  const directoryPath = fqnToRepositoryPath(fqn, repositoryName);
  if (
    !repositoryUrl ||
    !commitHash ||
    !directoryPath ||
    !isValidCommitHash(commitHash)
  ) {
    return undefined;
  }

  return buildTreeUrlForHost(repositoryUrl, commitHash, directoryPath);
}

function buildCommitPageUrl(
  repositoryUrl: string,
  commitHash: string
): string | undefined {
  if (!isValidCommitHash(commitHash)) {
    return undefined;
  }

  switch (getGitHost(repositoryUrl)) {
    case 'github':
      return `${repositoryUrl}/commit/${commitHash}`;
    case 'gitlab':
      return `${repositoryUrl}/-/commit/${commitHash}`;
    case 'bitbucket':
      return `${repositoryUrl}/commits/${commitHash}`;
    default:
      return undefined;
  }
}

function buildCommitCompareUrl(
  repositoryUrl: string,
  olderCommitHash: string,
  newerCommitHash: string
): string | undefined {
  if (
    !isValidCommitHash(olderCommitHash) ||
    !isValidCommitHash(newerCommitHash)
  ) {
    return undefined;
  }

  switch (getGitHost(repositoryUrl)) {
    case 'github':
      return `${repositoryUrl}/compare/${olderCommitHash}...${newerCommitHash}`;
    case 'gitlab':
      return `${repositoryUrl}/-/compare/${olderCommitHash}...${newerCommitHash}`;
    case 'bitbucket':
      return `${repositoryUrl}/branches/compare/${olderCommitHash}..${newerCommitHash}`;
    default:
      return undefined;
  }
}

export function buildCommitChartLinkUrl(
  remoteUrl: string | undefined,
  selectedCommitsForRepo: Commit[]
): string | undefined {
  const repositoryUrl = normalizeRepositoryUrl(remoteUrl);
  if (!repositoryUrl) {
    return undefined;
  }

  if (selectedCommitsForRepo.length === 0) {
    return repositoryUrl;
  }

  if (selectedCommitsForRepo.length === 1) {
    return buildCommitPageUrl(
      repositoryUrl,
      selectedCommitsForRepo[0].commitId
    );
  }

  return buildCommitCompareUrl(
    repositoryUrl,
    selectedCommitsForRepo[0].commitId,
    selectedCommitsForRepo[1].commitId
  );
}

export function getCommitChartLinkLabel(selectedCommitCount: number): string {
  if (selectedCommitCount === 0) {
    return 'Open Repository';
  }

  if (selectedCommitCount === 1) {
    return 'Open Commit';
  }

  return 'Compare Commits';
}

export function getCommitChartLinkTooltip(selectedCommitCount: number): string {
  if (selectedCommitCount === 0) {
    return 'Open repository in browser';
  }

  if (selectedCommitCount === 1) {
    return 'Open commit in browser';
  }

  return 'Open commit comparison in browser';
}

export function applyCommitHashToRepositoryFileUrl(
  fileUrl: string | undefined,
  commitHash: string | undefined
): string | undefined {
  if (!fileUrl || !commitHash) {
    return fileUrl;
  }

  if (!HOST_FILE_URL_COMMIT_PATTERN.test(fileUrl)) {
    return fileUrl;
  }

  return fileUrl.replace(HOST_FILE_URL_COMMIT_PATTERN, `$1${commitHash}$3`);
}
