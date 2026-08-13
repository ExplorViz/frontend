import {
  AnimationDeltaFrame,
  CommitComparison,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { WINDOW_SIZE } from './evolution-animation-store';

export type DecodedFileState = {
  action: CommitComparison;
  lastChangeIndex: number;
  lastChangeDate: number;
};

export function decodeDeltaFrame(
  deltaFrames: Map<number, AnimationDeltaFrame>,
  index: number
): Map<string, DecodedFileState> | null {
  const keyframeIndex = Math.floor(index / WINDOW_SIZE) * WINDOW_SIZE;
  const keyframe = deltaFrames.get(keyframeIndex);
  if (!keyframe?.keyframe || !keyframe.state) return null;

  const lastChangeIndexByFqn = new Map<string, number>();
  const lastChangeDateByFqn = new Map<string, number>();
  keyframe.state.forEach((entry) => {
    lastChangeIndexByFqn.set(entry.fqn, entry.lastChangeOrdinal);
    lastChangeDateByFqn.set(entry.fqn, entry.lastChangeDate);
  });

  for (let i = keyframeIndex + 1; i <= index; i++) {
    const frame = deltaFrames.get(i);
    if (!frame) return null;
    frame.changes?.forEach((change) => {
      if (change.action === 'REMOVED') {
        lastChangeIndexByFqn.delete(change.fqn);
        lastChangeDateByFqn.delete(change.fqn);
      } else {
        lastChangeIndexByFqn.set(change.fqn, i);
        lastChangeDateByFqn.set(change.fqn, frame.authorDate);
      }
    });
  }

  const currentChanges = deltaFrames.get(index)?.changes ?? [];
  const actionNow = new Map<string, CommitComparison>();
  currentChanges.forEach((change) => actionNow.set(change.fqn, change.action));

  const decoded = new Map<string, DecodedFileState>();
  lastChangeIndexByFqn.forEach((lastChangeIndex, fqn) => {
    decoded.set(fqn, {
      action: actionNow.get(fqn) ?? 'UNCHANGED',
      lastChangeIndex,
      lastChangeDate: lastChangeDateByFqn.get(fqn) ?? 0,
    });
  });

  currentChanges.forEach((change) => {
    if (change.action === 'REMOVED') {
      decoded.set(change.fqn, {
        action: 'REMOVED',
        lastChangeIndex: index,
        lastChangeDate: 0,
      });
    }
  });

  return decoded;
}
