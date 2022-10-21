import * as THREE from 'three';
import AppCommunicationMesh from 'explorviz-frontend/view-objects/3d/landscape/app-communication-mesh';
import { ApplicationCommunication } from './application-communication-computer';

// Simple 2-dimensional point
type Point = { x: number; y: number };

// Blueprint for a drawable application communication
type Tile = {
  startPoint: Point;
  endPoint: Point;
  positionZ: number;
  requestsCache: number;
  lineThickness: number;
  pipeColor: THREE.Color;
};

// Simplified Tile
type TileWay = { startPoint: Point; endPoint: Point };

/**
 * Checks wheter two given 2-d-points are equal based on their x- and
 * y-coordinate.
 *
 * @param p1 First point
 * @param p2 Second point
 */
function checkEqualityOfPoints(p1: Point, p2: Point) {
  const x = Math.abs(p1.x - p2.x) <= 0.01;
  const y = Math.abs(p1.y - p2.y) <= 0.01;

  return x && y;
}

/**
 * Checks whether two given tiles (models for application communication)
 * are equal based on their start and end points
 *
 * @param this First Tile for comparison check
 * @param tile Second Tile for comparison check
 */
function isSameTile(this: TileWay, tile: any) {
  return (
    checkEqualityOfPoints(this.endPoint, tile.endPoint) &&
    checkEqualityOfPoints(this.startPoint, tile.startPoint)
  );
}

/**
 * Aggregate points and request cache numbers of application communication
 * to get communication tiles. Those can later on be used to determine the
 * corresponding line thickness for the visualization.
 *
 * @param appCommunications Array of all application communications
 * @param color Desired color for the tiles
 */
export function computeCommunicationTiles(
  appCommunications: ApplicationCommunication[],
  modelIdToPoints: Map<string, Point[]>,
  color: THREE.Color,
  zOffset = 0.025
) {
  const tiles: Tile[] = [];
  let tile: Tile;

  appCommunications.forEach((applicationCommunication) => {
    const points = modelIdToPoints.get(applicationCommunication.id);

    if (points && points.length > 0) {
      for (let i = 1; i < points.length; i++) {
        const lastPoint = points[i - 1];
        const thisPoint = points[i];

        // Simpliefied tile to check for equality of tiles
        const tileWay = {
          startPoint: lastPoint,
          endPoint: thisPoint,
        };

        let id = tiles.findIndex(isSameTile, tileWay);

        if (id !== -1) {
          tile = tiles[id];
        } else {
          id = tiles.length; // Gets a new index

          tile = {
            startPoint: lastPoint,
            endPoint: thisPoint,
            positionZ: zOffset, // Tiles should be in front of nodes
            requestsCache: 0,
            lineThickness: 1, // Determined later on
            pipeColor: color,
          };
          tiles.push(tile);
        }

        // TODO: use actual request count for thickness
        // tile.requestsCache += applicationCommunication.requests;
        tile.requestsCache += 10;
      }
    }
  });

  return tiles;
}

/**
 * Maps a given value (# of requests) to a numerical category
 *
 * @param requests Value which should be classified
 * @param lowerThreshold Value which is used to define categories
 * @param upperThreshold Value which is used to define categories
 */
function getCategoryFromValue(
  requests: number,
  lowerThreshold: number,
  upperThreshold: number
) {
  if (requests === 0) {
    return 0.0;
  }
  if (requests === 1) {
    return 1.0;
  }
  if (requests <= lowerThreshold) {
    return 2.0;
  }
  if (requests <= upperThreshold) {
    return 3.0;
  }

  return 4.0;
}

/**
 * Scales all entries of a given liste linearly such that
 * the biggest item is set to 1.
 *
 * @param requestMap Maps number of requests to a numerical category
 */
function linearCategorization(requestMap: Map<number, number>) {
  let maxRequests = 1;

  requestMap.forEach((_category, requests) => {
    maxRequests = requests > maxRequests ? requests : maxRequests;
  });

  requestMap.forEach((_category, requests) => {
    const category = requests / maxRequests;
    requestMap.set(requests, category);
  });
}

/**
 * Maps number of requests to a numerical category
 *
 * @param requestMap Maps number of requests to a numerical category
 */
function categorizeByThreshold(requestMap: Map<number, number>) {
  let maxRequests = 1; // Keep track of max known requests

  requestMap.forEach((_category, requests) => {
    maxRequests = requests > maxRequests ? requests : maxRequests;
  });

  const lowerThreshold = maxRequests * (1 / 3);

  const upperThreshold = maxRequests * (2 / 3);

  requestMap.forEach((_category, requests) => {
    const category = getCategoryFromValue(
      requests,
      lowerThreshold,
      upperThreshold
    );
    requestMap.set(requests, category);
  });
}

/**
 * Maps number of requests in a map with a specified method to numerical classes
 *
 * @param requestMap Maps number of requests to a numerical category
 * @param isLinear Whether to use linear (continious) or threshold based categories
 */
function getCategories(requestMap: Map<number, number>, isLinear: boolean) {
  if (isLinear) {
    linearCategorization(requestMap);
  } else {
    categorizeByThreshold(requestMap);
  }

  return requestMap;
}

/**
 * Takes a list of tiles and requests their corresponding request category.
 * Those are used to draw a line with a specific thickness.
 *
 * @param tiles List of tiles (blueprints for communication drawing)
 * @param parent Object to which communication lines are added
 * @param centerPoint Offset of landscape objects: Used to align communication
 */
export function addCommunicationLineDrawing(
  tiles: Tile[],
  parent: THREE.Object3D,
  centerPoint: THREE.Vector2,
  minSize = 0.04,
  scalar = 0.28
) {
  const requestsToCategory = new Map();

  // Initialize Category mapping with default value 0
  tiles.forEach((tile) => {
    requestsToCategory.set(tile.requestsCache, 0);
  });

  const categoryMapping = getCategories(requestsToCategory, true);

  if (!categoryMapping && categoryMapping === undefined) return;

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const category = categoryMapping.get(tile.requestsCache);
    if (category) {
      tile.lineThickness = scalar * category + minSize;
      const line = new AppCommunicationMesh(tile);
      line.addOffset(centerPoint);
      parent.add(line);
    }
  }
}
