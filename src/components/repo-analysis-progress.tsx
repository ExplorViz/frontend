import { ProgressBar, Spinner } from 'react-bootstrap';
import { ProgressState } from '../hooks/useWatchAnalysisState';

const CURRENT_FILE_AREA_HEIGHT = '3rem';
const CURRENT_FILE_LINE_HEIGHT = '1.5rem';

export const RepoAnalysisProgress = ({
  state,
}: {
  state: ProgressState | null;
}) => {
  if (!state || state.status === 'pending')
    return (
      <div className="d-flex justify-content-center">
        <Spinner animation="border" role="status"></Spinner>
      </div>
    );

  const totalFiles = Math.max(0, state.totalFiles);
  const analyzedFiles = Math.min(Math.max(0, state.analyzedFiles), totalFiles);
  const percentage =
    totalFiles > 0 ? (analyzedFiles / totalFiles) * 100 : 0;
  const currentFile = state.currentAnalyzingFile ?? '';

  return (
    <div
      className="repo-analysis-progress overflow-hidden w-100"
      style={{ minWidth: 0 }}
    >
      <p className="mb-2">
        Analyzed commits: {state.analyzedCommits}/{state.totalCommits}
      </p>
      <ProgressBar
        now={percentage}
        label={`${percentage.toFixed(2)}%`}
        animated
        striped
      />
      <p
        className="mt-3 mb-0 text-break overflow-hidden"
        style={{
          minHeight: CURRENT_FILE_AREA_HEIGHT,
          maxHeight: CURRENT_FILE_AREA_HEIGHT,
          lineHeight: CURRENT_FILE_LINE_HEIGHT,
        }}
        title={currentFile || undefined}
      >
        {currentFile}
      </p>
    </div>
  );
};
