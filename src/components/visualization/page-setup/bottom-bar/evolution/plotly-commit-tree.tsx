import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  calculateCommitOffset,
  getCommitXPosition,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Branch,
  Commit,
  CROSS_COMMIT_IDENTIFIER,
  RepoNameCommitTreeMap,
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
  const COMMIT_SELECTED_SIZE = 20;
  const HIGHLIGHTED_MARKER_COLOR = 'red';

  const usedColors = useRef<Set<number[]>>(new Set());
  let branchNameToLineColor: Map<string, string> = new Map();
  let branchToY: Map<string, number> = new Map();
  let branchToColor: Map<string, string> = new Map();

  let [_repoNameCommitTreeMap, setRepoNameCommitTreeMap] =
    useState<RepoNameCommitTreeMap>(new Map());

  // #region useEffect & useRef
  const plotlyCommitDivRef = useRef(null);

  // #region Plot Setup
  function setupPlotlyCommitTreeChart() {
    // deep copy attributes (Map and Object is passed via reference, therefore changes in this component would actually be executed on the original element) -> nasty bugs
    setRepoNameCommitTreeMap(structuredClone(repoNameCommitTreeMap));

    usedColors.current.add([255, 255, 255]); // initialize with white so it won't be used as color for branches on a white background

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
      plotlyDiv.removeAllListeners?.('plotly_hover');
      plotlyDiv.removeAllListeners?.('plotly_unhover');
      plotlyDiv.removeAllListeners?.('plotly_click');

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
        const branchName = data.points[0].data.name;

        const commitId = getCommitId(branchName, pn);
        const selectedCommit: Commit = { commitId, branchName };

        const newSelectedCommits = new Map(selectedCommits);
        let selectedCommitsForRepo = [
          ...(newSelectedCommits.get(selectedRepoName) || []),
        ];

        const isAlreadySelected = selectedCommitsForRepo.some(
          (c) => c.commitId === selectedCommit.commitId
        );

        if (isAlreadySelected) {
          selectedCommitsForRepo = selectedCommitsForRepo.filter(
            (c) => c.commitId !== selectedCommit.commitId
          );
        } else {
          if (selectedCommitsForRepo.length === MAX_COMMIT_SELECTION_PER_APP) {
            selectedCommitsForRepo.shift();
          }
          selectedCommitsForRepo.push(selectedCommit);
        }

        if (selectedCommitsForRepo.length === 2) {
          selectedCommitsForRepo.sort((a, b) => {
            const xA = getCommitXPosition(
              _repoNameCommitTreeMap,
              selectedRepoName,
              a.branchName,
              a.commitId
            );
            const xB = getCommitXPosition(
              _repoNameCommitTreeMap,
              selectedRepoName,
              b.branchName,
              b.commitId
            );
            return xA - xB;
          });
        }

        if (selectedCommitsForRepo.length === 0) {
          newSelectedCommits.delete(selectedRepoName);
        } else {
          newSelectedCommits.set(selectedRepoName, selectedCommitsForRepo);
        }

        setSelectedCommits(newSelectedCommits);
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
      });

      // #endregion
    }
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
  }, [
    selectedRepoName,
    _repoNameCommitTreeMap,
    repoNameCommitTreeMap,
    selectedCommits,
  ]);

  // #endregion useEffect & useRef

  // #region Helper functions

  const getPlotlyDataObject = (
    commits: number[],
    colors: string[],
    sizes: number[],
    texts: string[],
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
      mode: 'lines+markers+text',
      type: 'scatter',
      hoverinfo: 'text',
      hoverlabel: {
        align: 'left',
      },
      text: texts,
      texttemplate: '%{text}',
      cliponaxis: false,
      hovertext: hoverText(repoNameCommitTreeMap, selectedRepoName, branch),
      textposition: 'middle center',
      textfont: {
        color: 'white',
        size: 10,
        family: 'Arial, sans-serif',
      },
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
      const cloneColorMap = getCloneOfRepoNameAndBranchNameToColorMap();
      let colorMapChanged = false;

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
        let color: string | undefined = cloneColorMap.get(
          selectedRepoName + branch.name
        );
        if (!color) {
          color = randomRGBA();
          cloneColorMap.set(selectedRepoName + branch.name, color);
          colorMapChanged = true;
        }
        const colors = Array.from(Array(numOfCommits)).map(() => color!);
        const sizes = Array.from(Array(numOfCommits)).map(
          () => COMMIT_UNSELECTED_SIZE
        );
        const texts = Array.from(Array(numOfCommits)).map(() => '');

        const allSelectedCommits = Array.from(selectedCommits.values()).flat();
        markCommit(allSelectedCommits, branch, colors, sizes, texts);

        const plotlyBranch = getPlotlyDataObject(
          commits,
          colors,
          sizes,
          texts,
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
      const connectionTraces: any[] = [];
      for (const branch of commitTreeForSelectedRepoName.branches) {
        const branchY = branchToY.get(branch.name);
        const branchX = calculateOffset(selectedRepoName, branch);

        const fromBranchY = branchToY.get(branch.branchPoint.name);
        const fromBranchX = branchX - 1;

        if (fromBranchY !== undefined && branchY !== undefined) {
          const color = branchToColor.get(branch.name)!;
          connectionTraces.push({
            line: { color: color, width: 2 },
            mode: 'lines',
            type: 'scatter',
            name: branch.name,
            x: [fromBranchX, branchX],
            y: [fromBranchY, branchY],
            hoverinfo: 'none',
          });
        }
      }
      plotlyBranches.unshift(...connectionTraces);

      const layout = getPlotlyLayoutObject(-5, 20, -5, 5);
      const plotlyDiv: any = plotlyCommitDivRef.current;
      if (plotlyDiv && plotlyDiv.layout) {
        if (plotlyDiv.layout.xaxis && plotlyDiv.layout.xaxis.range) {
          layout.xaxis.range = [...plotlyDiv.layout.xaxis.range];
        }
        if (plotlyDiv.layout.yaxis && plotlyDiv.layout.yaxis.range) {
          layout.yaxis.range = [...plotlyDiv.layout.yaxis.range];
        }
      }

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

      if (colorMapChanged) {
        setRepoNameAndBranchNameToColorMap(cloneColorMap);
      }

      Plotly.react(
        plotlyCommitDivRef.current,
        plotlyBranches,
        layout,
        getPlotlyOptionsObject()
      );
      setupPlotlyListener();
    }
  };

  const markCommit = (
    allSelectedCommits: Commit[],
    branch: Branch,
    colors: string[],
    sizes: number[],
    texts: string[]
  ) => {
    allSelectedCommits.forEach((selectedCommit, selectionIndex) => {
      const index = branch.commits.findIndex(
        (commitId) => commitId === selectedCommit.commitId
      );
      if (index !== -1) {
        colors[index] = HIGHLIGHTED_MARKER_COLOR;
        sizes[index] = COMMIT_SELECTED_SIZE;
        texts[index] = (selectionIndex + 1).toString();
      }
    });
  };

  const calculateOffset = (selectedRepoName: string, branch: Branch) => {
    return calculateCommitOffset(_repoNameCommitTreeMap, selectedRepoName, branch);
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
      for (const color of usedColors.current) {
        // only use darker colors (prevent white on white background)
        const diff =
          Math.abs(color[0] - red) +
          Math.abs(color[1] - green) +
          Math.abs(color[2] - blue);
        if (diff < 20) {
          // prevent to use colors that look very similar
          red = o(r() * s);
          green = o(r() * s);
          blue = o(r() * s);
          permission = false;
          break;
        }
      }
    }
    const rgb = [red, green, blue];
    usedColors.current.add(rgb);
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
        <div ref={plotlyCommitDivRef} className="plotlyCommitDiv"></div>
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
