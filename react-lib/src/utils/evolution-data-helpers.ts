import { AppNameCommitTreeMap } from 'react-lib/src/utils/evolution-schemes/evolution-data';

export function findAppNameAndBranchNameForCommit(
  appCommitMap: AppNameCommitTreeMap,
  targetCommit: string
): { appName: string; branchName: string } | undefined {
  for (const [appName, commitTree] of appCommitMap.entries()) {
    for (const branch of commitTree.branches) {
      if (branch.commits.includes(targetCommit)) {
        return { appName, branchName: branch.name };
      }
    }
  }
  return undefined;
}
