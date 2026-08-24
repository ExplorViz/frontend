import {
  AnimationDeltaFrame,
  CommitComparison,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { WINDOW_SIZE } from './evolution-animation-store';

export type DecodedFileState = {
  action: CommitComparison;
  lastAction: CommitComparison;
  lastChangeIndex: number;
  lastChangeDate: number;
};

export function decodeDeltaFrame(
  deltaFrames: Map<number, AnimationDeltaFrame>,
  index: number,
  keepRemovedVisible = false
): Map<string, DecodedFileState> | null {
  const keyframeIndex = Math.floor(index / WINDOW_SIZE) * WINDOW_SIZE;
  const keyframe = deltaFrames.get(keyframeIndex);
  if (!keyframe?.keyframe || !keyframe.state) return null;

  const lastChangeIndexByFqn = new Map<string, number>();
  const lastChangeDateByFqn = new Map<string, number>();
  const lastActionByFqn = new Map<string, CommitComparison>();
  keyframe.state.forEach((entry) => {
    lastChangeIndexByFqn.set(entry.fqn, entry.lastChangeOrdinal);
    lastChangeDateByFqn.set(entry.fqn, entry.lastChangeDate);
    lastActionByFqn.set(entry.fqn, entry.lastAction);
  });

  for (let i = keyframeIndex + 1; i <= index; i++) {
    const frame = deltaFrames.get(i);
    if (!frame) return null;
    frame.changes?.forEach((change) => {
      lastChangeIndexByFqn.set(change.fqn, i);
      lastChangeDateByFqn.set(change.fqn, frame.authorDate);
      lastActionByFqn.set(change.fqn, change.action);
    });
  }

  const currentChanges = deltaFrames.get(index)?.changes ?? [];
  const actionNow = new Map<string, CommitComparison>();
  currentChanges.forEach((change) => actionNow.set(change.fqn, change.action));

  const decoded = new Map<string, DecodedFileState>();
  lastActionByFqn.forEach((lastAction, fqn) => {
    const removed = lastAction === 'REMOVED';
    if (removed && !keepRemovedVisible && actionNow.get(fqn) !== 'REMOVED') {
      return;
    }
    decoded.set(fqn, {
      action: actionNow.get(fqn) ?? (removed ? 'REMOVED' : 'UNCHANGED'),
      lastAction,
      lastChangeIndex: lastChangeIndexByFqn.get(fqn) ?? 0,
      lastChangeDate: lastChangeDateByFqn.get(fqn) ?? 0,
    });
  });
  return decoded;
}
