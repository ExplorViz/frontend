import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  Branch,
  Commit,
  CROSS_COMMIT_IDENTIFIER,
  RepoNameCommitTreeMap
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import Plotly from 'plotly.js-dist';
import { useEffect, useRef, useState } from 'react';

interface PlotlyCommitTreeArgs {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
  selectedRepoName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
  triggerVizRenderingForSelectedCommits(): void;
  setSelectedCommits(newSelectedCommits: Map<string, SelectedCommit[]>): void;
  getCloneOfRepoNameAndBranchNameToColorMap(): Map<string, string>;
  setRepoNameAndBranchNameToColorMap(
    newRepoNameAndBranchNameToColorMap: Map<string, string>
  ): void;
}

export default function PlotlyCommitTree({
  repoNameCommitTreeMap,
  selectedRepoName,
  selectedCommits,
  triggerVizRenderingForSelectedCommits,
  setSelectedCommits,
  getCloneOfRepoNameAndBranchNameToColorMap,
  setRepoNameAndBranchNameToColorMap,
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

  let [_repoNameCommitTreeMap, setRepoNameCommitTreeMap] =
    useState<RepoNameCommitTreeMap>(new Map());

  // #endregion template-argument getters

  // #region useEffect & useRef
  const plotlyCommitDivRef = useRef(null);

  // #region Plot Setup
  function setupPlotlyCommitTreeChart() {
    // deep copy attributes (Map and Object is passed via reference, therefore changes in this component would actually be executed on the original element) -> nasty bugs
    setRepoNameCommitTreeMap(structuredClone(repoNameCommitTreeMap));

    usedColors.add([255, 255, 255]); // initialize with white so it won't be used as color for branches on a white background

    if (_repoNameCommitTreeMap && selectedRepoName && selectedCommits) {
      updatePlotlyCommitTree();
    }
  }

  function updatePlotlyCommitTree() {
    if (_repoNameCommitTreeMap && selectedRepoName && selectedCommits) {
      createPlotlyCommitTreeChart(
        _repoNameCommitTreeMap,
        selectedRepoName,
        selectedCommits
      );
    }

  }

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

        let selectedCommitsForRepo = selectedCommits.get(selectedRepoName) || [];
        selectedCommits.set(selectedRepoName, selectedCommitsForRepo);

        if (
          isCommitAlreadySelected(
            selectedCommitsForRepo,
            selectedCommit.commitId
          )
        ) {
          unselectCommit(selectedCommit, pn);
        } else {
          if (selectedCommitsForRepo.length === MAX_COMMIT_SELECTION_PER_APP) {
            unselectAllCommits();
          } else {
            selectCommit(selectedCommit, pn);
          }
        }

        // Filter out empty selections and remove empty applications
        // for (const [app, commits] of selectedCommits.entries()) {
        for (const [repo, commits] of selectedCommits.entries()) {
          if (commits.length === 0) {
            selectedCommits.delete(repo);
          }
        }

        setSelectedCommits(selectedCommits);
        triggerVizRenderingForSelectedCommits();

        function getCommitId(branchName: string, pointNumber: number): string {
          const commitTreeForSelectedRepoName =
            repoNameCommitTreeMap.get(selectedRepoName);

          if (commitTreeForSelectedRepoName) {
            for (const branch of commitTreeForSelectedRepoName.branches) {
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
          selectedCommits.set(selectedRepoName, []);

          const commitTreeForSelectedRepoName =
            _repoNameCommitTreeMap.get(selectedRepoName);

          if (commitTreeForSelectedRepoName) {
            for (const branch of commitTreeForSelectedRepoName.branches) {
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
          selectedCommitsForRepo.push(commit);

          colors[pointNumber] = highlightedMarkerColor;
          sizes[pointNumber] = COMMIT_SELECTED_SIZE;
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);
        }

        function unselectCommit(commit: Commit, pointNumber: number) {
          selectedCommitsForRepo = selectedCommitsForRepo.filter(
            (c) => c.commitId !== commit.commitId
          );
          colors[pointNumber] = data.points[0].fullData.line.color;
          sizes[pointNumber] = COMMIT_UNSELECTED_SIZE;
          if (selectedCommitsForRepo.length === 0) {
            selectedCommits.delete(selectedRepoName);
          } else {
            selectedCommits.set(selectedRepoName, selectedCommitsForRepo);
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

  // #endregion Plot Setup

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

  useEffect(() => {
    // Only setup chart if we have valid data
    if (
      repoNameCommitTreeMap &&
      selectedRepoName &&
      repoNameCommitTreeMap.get(selectedRepoName)?.branches
    ) {
      setupPlotlyCommitTreeChart();
    }
  }, [repoNameCommitTreeMap, selectedRepoName]);

  useEffect(() => {
    // Only update chart if we have valid data and the div exists
    if (
      plotlyCommitDivRef.current &&
      repoNameCommitTreeMap &&
      selectedRepoName &&
      repoNameCommitTreeMap.get(selectedRepoName)?.branches
    ) {
      updatePlotlyCommitTree();
    }
  }, [selectedRepoName, _repoNameCommitTreeMap, repoNameCommitTreeMap]);

  // #endregion useEffect & useRef

  // #region Helper functions

  const getPlotlyDataObject = (
    commits: number[],
    colors: string[],
    sizes: number[],
    branch: number,
    branchName: string,
    repoNameCommitTreeMap: RepoNameCommitTreeMap,
    selectedRepoName: string,
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
      text: hoverText(repoNameCommitTreeMap, selectedRepoName, branch),
      x: commits,
      y: Array.from(Array(commits.length)).map(() => branch),
    };
  };

  const createPlotlyCommitTreeChart = (
    repoNameCommitTreeMap: RepoNameCommitTreeMap,
    selectedRepoName: string,
    selectedCommits: Map<string, Commit[]>
  ) => {
    const commitTreeForSelectedRepoName =
      repoNameCommitTreeMap.get(selectedRepoName);

    if (
      commitTreeForSelectedRepoName &&
      commitTreeForSelectedRepoName.branches &&
      commitTreeForSelectedRepoName.branches.find(
        (branch) => branch.commits.length > 0
      )
    ) {
      // create branches
      const plotlyBranches: any[] = [];
      let branchCounter = 0;

      for (const branch of commitTreeForSelectedRepoName.branches) {
        const numOfCommits = branch.commits.length;
        const offset = calculateOffset(selectedRepoName, branch);
        const commits = Array.from(
          { length: numOfCommits },
          (_, i) => i + offset
        );
        const color = createColor(branch.name);
        const colors = Array.from(Array(numOfCommits)).map(() => color);
        const sizes = Array.from(Array(numOfCommits)).map(
          () => COMMIT_UNSELECTED_SIZE
        );

        const selectedCommitsForSelectedRepoName =
          selectedCommits.get(selectedRepoName);
        if (selectedCommitsForSelectedRepoName) {
          markCommit(selectedCommitsForSelectedRepoName, branch, colors, sizes);
        }

        const plotlyBranch = getPlotlyDataObject(
          commits,
          colors,
          sizes,
          branchCounter,
          branch.name,
          repoNameCommitTreeMap,
          selectedRepoName,
          color
        );
        plotlyBranches.push(plotlyBranch);
        branchToY.set(branch.name, branchCounter);
        branchToColor.set(branch.name, color);

        branchCounter++;
      }

      // add branch-to-branch connections
      for (const branch of commitTreeForSelectedRepoName.branches) {
        const branchY = branchToY.get(branch.name);
        const branchX = calculateOffset(selectedRepoName, branch);

        const fromBranchY = branchToY.get(branch.branchPoint.name);
        const fromBranchX = branchX - 1;

        if (fromBranchY !== undefined && branchY !== undefined) {
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
      setupPlotlyListener();
    }
  };

  const createColor = (branchName: string) => {
    const cloneColorMap = getCloneOfRepoNameAndBranchNameToColorMap();

    let color: string | undefined = cloneColorMap.get(
      selectedRepoName + branchName
    );
    if (!color) {
      color = randomRGBA();
      cloneColorMap.set(selectedRepoName + branchName, color);
      setRepoNameAndBranchNameToColorMap(cloneColorMap);
    }
    return color;
  };

  const markCommit = (
    selectedCommitsForSelectedRepoName: Commit[],
    branch: Branch,
    colors: string[],
    sizes: number[]
  ) => {
    for (const selectedCommit of selectedCommitsForSelectedRepoName) {
      const index = branch.commits.findIndex(
        (commitId) => commitId === selectedCommit.commitId
      );
      if (index !== -1) {
        colors[index] = highlightedMarkerColor;
        sizes[index] = COMMIT_SELECTED_SIZE;
      }
    }
  };

  const calculateOffset = (selectedRepoName: string, branch: Branch) => {
    // TODO: commit can have more than one predecessor (if merged). So we need to calculate and add the maximum of both recursive calls to our counter

    const commitTreeForSelectedRepoName =
      _repoNameCommitTreeMap.get(selectedRepoName);

    let counter = 0;

    if (commitTreeForSelectedRepoName) {
      const fromCommit = branch.branchPoint.commit;
      const fromBranch = branch.branchPoint.name;

      if (fromBranch !== 'NONE') {
        for (const b of commitTreeForSelectedRepoName.branches) {
          if (b.name === fromBranch) {
            for (const commit of b.commits) {
              counter++;
              if (commit === fromCommit) {
                counter += calculateOffset(selectedRepoName, b);
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
    repoNameCommitTreeMap: RepoNameCommitTreeMap,
    selectedRepoName: string,
    branch: number
  ) => {
    const commitTreeForRepo = repoNameCommitTreeMap.get(selectedRepoName);

    if (commitTreeForRepo) {
      let branchCounter = 0;
      for (const b of commitTreeForRepo.branches) {
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
      {repoNameCommitTreeMap &&
      selectedRepoName &&
      repoNameCommitTreeMap.get(selectedRepoName)?.branches ? (
        <div
          ref={plotlyCommitDivRef}
          className="plotlyCommitDiv"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        ></div>
      ) : (
        repoNameCommitTreeMap &&
        repoNameCommitTreeMap.size > 0 && (
          <div className="commit-tree-no-data-container">
            <div className="commit-tree-no-data-message">
              {selectedRepoName
                ? 'No commit tree data available!'
                : 'No repository selected!'}
            </div>
          </div>
        )
      )}
    </>
  );
}
