import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

/*
 * Remembers which landscape a filtered copy was made from, so that a filter
 * can be told apart from a change of the data (e.g. another Timestamp): the
 * stable layout keeps learning from the unfiltered landscape and only shows
 * the filtered one.
 */

const sources = new WeakMap<FlatLandscape, FlatLandscape>();

/** This landscape is `source` with some entities filtered out (and possibly Districts collapsed). */
export function markFilteredFrom(filtered: FlatLandscape, source: FlatLandscape): void {
  if (filtered !== source) sources.set(filtered, source);
}

/** The landscape before any filter, or the landscape itself if no filter made it. */
export function getUnfilteredLandscape(landscape: FlatLandscape): FlatLandscape {
  let unfiltered = landscape;
  for (let source = sources.get(unfiltered); source; source = sources.get(unfiltered)) {
    unfiltered = source;
  }
  return unfiltered;
}
