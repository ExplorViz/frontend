import { ProgressBar, Spinner } from "react-bootstrap";
import { ProgressState } from "../hooks/useWatchAnalysisState";

export const RepoAnalysisProgress = ({ state }: { state: ProgressState | null }) => {
  if (!state || state.status === 'pending') return (
    <div className='d-flex justify-content-center'>
      <Spinner animation="border" role="status"></Spinner>
    </div>
  )

  const filesProgressInCurrentCommit = state.totalFiles > 0
    ? state.analyzedFiles / state.totalFiles
    : 0;

  const percentage = filesProgressInCurrentCommit * 100;

  return (
    <div>
      <p>Analysed commits: {state.analyzedCommits}/{state.totalCommits}</p>      
      <ProgressBar now={percentage} label={`${percentage.toFixed(2)}%`} animated striped />
      {state.currentAnalysingFile && (
        <p className='mt-3'>{state.currentAnalysingFile}</p>
      )}
    </div>
  );
}