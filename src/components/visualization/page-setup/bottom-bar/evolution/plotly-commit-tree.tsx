import { useEffect, useRef, useState } from 'react';
import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  AppNameCommitTreeMap,
  Branch,
  Commit,
  CROSS_COMMIT_IDENTIFIER,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import Plotly from 'plotly.js-dist';

interface PlotlyCommitTreeArgs {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  selectedAppName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
  triggerVizRenderingForSelectedCommits(): void;
  setSelectedCommits(newSelectedCommits: Map<string, SelectedCommit[]>): void;
  getCloneOfAppNameAndBranchNameToColorMap(): Map<string, string>;
  setAppNameAndBranchNameToColorMap(
    newAppNameAndBranchNameToColorMap: Map<string, string>
  ): void;
}

export default function PlotlyCommitTree({
  appNameCommitTreeMap,
  selectedAppName,
  selectedCommits,
  triggerVizRenderingForSelectedCommits,
  setSelectedCommits,
  getCloneOfAppNameAndBranchNameToColorMap,
  setAppNameAndBranchNameToColorMap,
}: PlotlyCommitTreeArgs) {
  const MAX_COMMIT_SELECTION_PER_APP = 2;
  const COMMIT_UNSELECTED_SIZE = 8;
  const COMMIT_SELECTED_SIZE = 15;

  // TODO: Use this property, only set and never read as of now
  let userSlidingWindow = null;

  let usedColors: Set<number[]> = new Set();
  let branchNameToLineColor: Map<string, string> = new Map();
  let branchToY: Map<string, number> = new Map();
  let branchToColor: Map<string, string> = new Map();

  // #region template-argument getters

  const highlightedMarkerColor = (() => {
    return 'red';
  })();

  let _selectedCommits: Map<string, Commit[]> = new Map();
  let [_appNameCommitTreeMap, setAppNameCommitTreeMap] =
    useState<AppNameCommitTreeMap>(new Map());

  const _selectedAppName = (() => {
    return selectedAppName;
  })();

  // #endregion template-argument getters

  // #region useEffect & useRef
  const plotlyCommitDivRef = useRef(null);
  const plotlyDivNoTimestampsRef = useRef(null);

  useEffect(() => {
    if (plotlyCommitDivRef.current) {
      setupPlotlyCommitTreeChart();
    } else if (plotlyDivNoTimestampsRef.current) {
      setupPlotlyCommitTreeChart();
    }
  }, []);

  useEffect(() => {
    if (plotlyCommitDivRef.current) {
      updatePlotlyCommitTree();
      setupPlotlyListener();
    }
  }, [plotlyCommitDivRef.current, selectedAppName]);

  // #endregion useEffect & useRef

  // #region Ember Div Events
  const handleMouseEnter = (plotlyDiv: any) => {
    // if user hovers over plotly, save his
    // sliding window, so that updating the
    // plot won't modify his current viewport
    if (plotlyDiv && plotlyDiv.layout) {
      userSlidingWindow = plotlyDiv.layout;
    }
  };

  const handleMouseLeave = () => {
    userSlidingWindow = null;
  };
  // #endregion

  // #region Plot Setup

  const setupPlotlyCommitTreeChart = () => {
    // deep copy attributes (Map and Object is passed via reference, therefor changes in this component would actually be executed on the original element) -> nasty bugs
    setAppNameCommitTreeMap(structuredClone(appNameCommitTreeMap));
    _selectedCommits = structuredClone(selectedCommits);

    usedColors.add([255, 255, 255]); // initialize with white so it won't be used as color for branches on a white background

    if (_appNameCommitTreeMap && _selectedAppName && _selectedCommits) {
      updatePlotlyCommitTree();
      setupPlotlyListener();
    }
  };

  const setupPlotlyListener = () => {
    const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];
    const plotlyDiv: any = plotlyCommitDivRef.current;

    if (plotlyDiv && plotlyDiv.layout) {
      plotlyDiv.on('plotly_hover', () => {
        dragLayer.style.cursor = 'pointer';
      });

      plotlyDiv.on('plotly_unhover', () => {
        dragLayer.style.cursor = '';
      });

      // #region Click Event

      // singe click
      plotlyDiv.on('plotly_click', async (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        if (data.points[0].data.mode === 'markers') {
          // no functionality for metric circles
          return;
        }

        const pn = data.points[0].pointNumber;
        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;
        const branchName = data.points[0].data.name;

        const commitId = getCommitId(branchName, pn);
        const selectedCommit: Commit = { commitId, branchName };

        let selectedCommitsForApp =
          _selectedCommits.get(_selectedAppName) || [];

        if (
          isCommitAlreadySelected(
            selectedCommitsForApp,
            selectedCommit.commitId
          )
        ) {
          unselectCommit(selectedCommit, pn);
        } else {
          if (selectedCommitsForApp.length === MAX_COMMIT_SELECTION_PER_APP) {
            unselectAllCommits();
          } else {
            selectCommit(selectedCommit, pn);
          }
        }

        // Filter out empty selections and remove empty applications
        for (const [app, commits] of _selectedCommits.entries()) {
          if (commits.length === 0) {
            _selectedCommits.delete(app);
          }
        }

        setSelectedCommits(_selectedCommits);
        triggerVizRenderingForSelectedCommits();

        function getCommitId(branchName: string, pointNumber: number): string {
          const commitTreeForSelectedAppName =
            appNameCommitTreeMap.get(_selectedAppName);

          if (commitTreeForSelectedAppName) {
            for (const branch of commitTreeForSelectedAppName.branches) {
              if (branch.name === branchName) {
                return branch.commits[pointNumber];
              }
            }
          }
          return CROSS_COMMIT_IDENTIFIER;
        }

        function isCommitAlreadySelected(
          commitList: Commit[],
          commitId: string
        ): boolean {
          return commitList.some((commit) => commit.commitId === commitId);
        }

        function unselectAllCommits() {
          _selectedCommits.set(_selectedAppName, []);

          const commitTreeForSelectedAppName =
            _appNameCommitTreeMap.get(_selectedAppName);

          if (commitTreeForSelectedAppName) {
            for (const branch of commitTreeForSelectedAppName.branches) {
              const curveNumber = branchToY.get(branch.name);
              colors = Array(branch.commits.length).fill(
                branchNameToLineColor.get(branch.name)
              );
              sizes = Array(branch.commits.length).fill(COMMIT_UNSELECTED_SIZE);
              const update = { marker: { color: colors, size: sizes } };
              Plotly.restyle(plotlyDiv, update, curveNumber);
            }
          }
        }

        function selectCommit(commit: Commit, pointNumber: number) {
          colors[pointNumber] = highlightedMarkerColor;
          sizes[pointNumber] = COMMIT_SELECTED_SIZE;
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);

          selectedCommitsForApp.push(commit);
          _selectedCommits.set(_selectedAppName, selectedCommitsForApp);
        }

        function unselectCommit(commit: Commit, pointNumber: number) {
          selectedCommitsForApp = selectedCommitsForApp.filter(
            (c) => c.commitId !== commit.commitId
          );
          colors[pointNumber] = data.points[0].fullData.line.color;
          sizes[pointNumber] = COMMIT_UNSELECTED_SIZE;
          if (selectedCommitsForApp.length === 0) {
            _selectedCommits.delete(_selectedAppName);
          } else {
            _selectedCommits.set(_selectedAppName, selectedCommitsForApp);
          }
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);
        }
      });

      // #endregion
    }
  };

  // #endregion

  // #region Plot Update

  const updatePlotlyCommitTree = () => {
    if (_appNameCommitTreeMap && _selectedAppName && _selectedCommits) {
      createPlotlyCommitTreeChart(
        _appNameCommitTreeMap,
        _selectedAppName,
        _selectedCommits
      );
    }
  };

  // #endregion

  // #region Helper functions

  const getPlotlyDataObject = (
    commits: number[],
    colors: string[],
    sizes: number[],
    branch: number,
    branchName: string,
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedAppName: string,
    lineColor: string
  ) => {
    branchNameToLineColor.set(branchName, lineColor);
    return {
      name: branchName,
      marker: { color: colors, size: sizes },
      line: { color: lineColor, width: 2 },
      mode: 'lines+markers',
      type: 'scatter',
      hoverinfo: 'text',
      hoverlabel: {
        align: 'left',
      },
      text: hoverText(appNameCommitTreeMap, selectedAppName, branch),
      x: commits,
      y: Array.from(Array(commits.length)).map(() => branch),
    };
  };

  const createPlotlyCommitTreeChart = (
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedAppName: string,
    selectedCommits: Map<string, Commit[]>
  ) => {
    const commitTreeForSelectedAppName =
      appNameCommitTreeMap.get(selectedAppName);

    if (
      commitTreeForSelectedAppName &&
      commitTreeForSelectedAppName.branches &&
      commitTreeForSelectedAppName.branches.find(
        (branch) => branch.commits.length > 0
      )
    ) {
      // create branches
      const plotlyBranches: any[] = [];
      let branchCounter = 0;

      for (const branch of commitTreeForSelectedAppName.branches) {
        const numOfCommits = branch.commits.length;
        const offset = calculateOffset(selectedAppName, branch);
        const commits = Array.from(
          { length: numOfCommits },
          (_, i) => i + offset
        );
        const color = createColor(branch.name);
        const colors = Array.from(Array(numOfCommits)).map(() => color);
        const sizes = Array.from(Array(numOfCommits)).map(
          () => COMMIT_UNSELECTED_SIZE
        );

        const selectedCommitsForSelectedAppName =
          selectedCommits.get(selectedAppName);
        if (selectedCommitsForSelectedAppName) {
          markCommit(selectedCommitsForSelectedAppName, branch, colors, sizes);
        }

        const plotlyBranch = getPlotlyDataObject(
          commits,
          colors,
          sizes,
          branchCounter,
          branch.name,
          appNameCommitTreeMap,
          selectedAppName,
          color
        );
        plotlyBranches.push(plotlyBranch);
        branchToY.set(branch.name, branchCounter);
        branchToColor.set(branch.name, color);

        branchCounter++;
      }

      // add branch-to-branch connections
      for (const branch of commitTreeForSelectedAppName.branches) {
        const branchY = branchToY.get(branch.name);
        const branchX = calculateOffset(selectedAppName, branch);

        const fromBranchY = branchToY.get(branch.branchPoint.name);
        const fromBranchX = branchX - 1;

        if (fromBranchY !== undefined && branchY) {
          // fromBranchY can be 0 so we explicitly ask for undefined

          const color = branchToColor.get(branch.name)!;
          plotlyBranches.push({
            line: { color: color, width: 2 },
            mode: 'lines',
            type: 'scatter',
            name: branch.name,
            x: [fromBranchX, branchX],
            y: [fromBranchY, branchY],
          });
        }
      }

      const layout = getPlotlyLayoutObject(-5, 20, -5, 5);
      branchToY.forEach((val, key) => {
        layout.annotations.push({
          xref: 'paper',
          x: 0,
          y: val,
          xanchor: 'left',
          yanchor: 'middle',
          text: key,
          showarrow: false,
          font: {
            family: 'Arial',
            size: 13,
            color: 'black',
          },
        });
      });

      Plotly.react(
        plotlyCommitDivRef.current,
        plotlyBranches,
        layout,
        getPlotlyOptionsObject()
      );
    }
  };

  const createColor = (branchName: string) => {
    const cloneColorMap = getCloneOfAppNameAndBranchNameToColorMap();

    let color: string | undefined = cloneColorMap.get(
      _selectedAppName + branchName
    );
    if (!color) {
      color = randomRGBA();
      cloneColorMap.set(_selectedAppName + branchName, color);
      setAppNameAndBranchNameToColorMap(cloneColorMap);
    }
    return color;
  };

  const markCommit = (
    selectedCommitsForSelectedAppName: Commit[],
    branch: Branch,
    colors: string[],
    sizes: number[]
  ) => {
    for (const selectedCommit of selectedCommitsForSelectedAppName) {
      const index = branch.commits.findIndex(
        (commitId) => commitId === selectedCommit.commitId
      );
      if (index !== -1) {
        colors[index] = highlightedMarkerColor;
        sizes[index] = COMMIT_SELECTED_SIZE;
      }
    }
  };

  const calculateOffset = (selectedAppName: string, branch: Branch) => {
    // TODO: commit can have more than one predecessor (if merged). So we need to calculate and add the maximum of both recursive calls to our counter

    const commitTreeForSelectedAppName =
      _appNameCommitTreeMap.get(selectedAppName);

    let counter = 0;

    if (commitTreeForSelectedAppName) {
      const fromCommit = branch.branchPoint.commit;
      const fromBranch = branch.branchPoint.name;

      if (fromBranch !== 'NONE') {
        for (const b of commitTreeForSelectedAppName.branches) {
          if (b.name === fromBranch) {
            for (const commit of b.commits) {
              counter++;
              if (commit === fromCommit) {
                counter += calculateOffset(selectedAppName, b);
                break;
              }
            }
            break;
          }
        }
      }
    }
    return counter;
  };

  const randomRGBA = () => {
    const o = Math.round,
      r = Math.random,
      s = 255;

    let red = o(r() * s);
    let green = o(r() * s);
    let blue = o(r() * s);

    let permission = false;
    while (!permission) {
      permission = true;
      for (const color of usedColors) {
        // only use darker colors (prevent white on white background)
        const diff =
          Math.abs(color[0] - red) +
          Math.abs(color[1] - green) +
          Math.abs(color[2] - blue);
        if (diff < 20) {
          // prevent to use colors that look very similiar
          red = o(r() * s);
          green = o(r() * s);
          blue = o(r() * s);
          permission = false;
          break;
        }
      }
    }
    const rgb = [red, green, blue];
    usedColors.add(rgb);
    return 'rgba(' + red + ',' + green + ',' + blue + ',' + '1)';
  };

  const hoverText = (
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedAppName: string,
    branch: number
  ) => {
    const commitTreeForApp = appNameCommitTreeMap.get(selectedAppName);

    if (commitTreeForApp) {
      let branchCounter = 0;
      for (const b of commitTreeForApp.branches) {
        if (branch === branchCounter) {
          return b.commits.map((commit) => 'Commit ID: ' + commit);
          break;
        }
        branchCounter++;
      }
    }
    return 'no commit id found';
  };

  const getPlotlyLayoutObject = (
    minRangeX: number,
    maxRangeX: number,
    minRangeY: number,
    maxRangeY: number
  ): {
    hovermode: string;
    hoverdistance: number;
    dragmode: string;
    margin: {
      b: number;
      pad: number;
      t: number;
      r: number;
    };
    xaxis: {
      showline: boolean;
      showgrid: boolean;
      showticklabels: boolean;
      range: number[];
    };
    yaxis: {
      showgrid: boolean;
      zeroline: boolean;
      showline: boolean;
      showticklabels: boolean;
      range: number[];
      title: {
        font: {
          color: string;
          size: number;
        };
        text: string;
      };
    };
    annotations: any[];
  } => {
    return {
      hovermode: 'closests',
      hoverdistance: 3,
      dragmode: 'pan',
      margin: {
        b: 120,
        pad: 5,
        t: 20,
        r: 40,
      },
      xaxis: {
        range: [minRangeX, maxRangeX],
        showline: false,
        showgrid: false,
        showticklabels: false,
      },

      yaxis: {
        range: [minRangeY, maxRangeY],
        showgrid: false,
        zeroline: false,
        showline: false,
        showticklabels: false,
        title: {
          font: {
            color: '#7f7f7f',
            size: 16,
          },
          text: 'Branches',
        },
      },
      annotations: [],
    };
  };

  const getPlotlyOptionsObject = () => {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  };

  return (
    <>
      {appNameCommitTreeMap &&
      selectedAppName &&
      appNameCommitTreeMap.get(selectedAppName)?.branches ? (
        <div
          ref={plotlyCommitDivRef}
          className="plotlyCommitDiv"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        ></div>
      ) : (
        appNameCommitTreeMap &&
        appNameCommitTreeMap.size > 0 && (
          <>
            <div className="timeline-no-timestamps-outer">
              <div className="timeline-no-timestamps-inner">
                {selectedAppName
                  ? 'No commit tree data available!'
                  : 'No application selected!'}
              </div>
            </div>
            <div
              ref={plotlyDivNoTimestampsRef}
              className="plotlyDiv timeline-blur-effect"
            ></div>
          </>
        )
      )}
    </>
  );
}
