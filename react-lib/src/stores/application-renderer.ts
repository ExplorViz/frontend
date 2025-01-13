import { createStore } from "zustand/vanilla";

import * as THREE from "three";
import ThreeForceGraph from "three-forcegraph";

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
