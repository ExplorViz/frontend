import { RepoNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';

export function findRepoNameAndBranchNameForCommit(
  repoCommitMap: RepoNameCommitTreeMap,
  targetCommit: string
): { repoName: string; branchName: string } | undefined {
  for (const [repoName, commitTree] of repoCommitMap.entries()) {
    for (const branch of commitTree.branches) {
      if (branch.commits.includes(targetCommit)) {
        return { repoName, branchName: branch.name };
      }
    }
  }
  return undefined;
}
