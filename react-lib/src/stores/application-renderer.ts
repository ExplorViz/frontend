import { createStore } from 'zustand/vanilla';

import * as THREE from 'three';
import ThreeForceGraph from 'three-forcegraph';
import {
  HightlightComponentArgs,
  removeAllHighlightingFor,
} from 'react-lib/src/utils/application-rendering/highlighting';

export type LayoutData = {
  height: number;
  width: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
};

export type AddApplicationArgs = {
  position?: THREE.Vector3;
  quaternion?: THREE.Quaternion;
  scale?: THREE.Vector3;
  transparentComponents?: Set<string>;
  openComponents?: Set<string>;
  highlightedComponents?: HightlightComponentArgs[];
};

interface ApplicationRendererState {
  forceGraph?: ThreeForceGraph;
  // TODO: migrate ApplicationObject3D first
  //   _openApplicationsMap: Map<string, ApplicationObject3D>;
  // TODO: migrate CommunicationRendering first
  //   _appCommRendering: CommunicationRendering;
}

export const useApplicationRendererStore =
  createStore<ApplicationRendererState>((set, get) => ({
    forceGraph: undefined,
    // TODO map?
    // _openApplicationsMap: new Map(),
    // _appCommRendering = new CommunicationRendering(),
  }));
