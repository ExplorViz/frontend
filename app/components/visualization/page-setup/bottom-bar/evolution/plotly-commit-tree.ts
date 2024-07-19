import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import Plotly from 'plotly.js-dist';
import {
  AppNameCommitTreeMap,
  Branch,
  Commit,
} from 'explorviz-frontend/utils/evolution-schemes/evolution-data';
import { SelectedCommit } from 'explorviz-frontend/utils/commit-tree/commit-tree-handler';

interface IArgs {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  selectedAppName: string;
  selectedCommits: Map<string, SelectedCommit[]>;
  triggerVizRenderingForSelectedCommits(
    commitsToBeVisualized: Map<string, SelectedCommit[]>
  ): void;
  setSelectedCommits(newSelectedCommits: Map<string, SelectedCommit[]>): void;
  getCloneOfAppNameAndBranchNameToColorMap(): Map<string, string>;
  setAppNameAndBranchNameToColorMap(
    newAppNameAndBranchNameToColorMap: Map<string, string>
  ): void;
}

export default class PlotlyCommitTree extends Component<IArgs> {
  private readonly debug = debugLogger('PlotlyCommitTree');

  private MAX_COMMIT_SELECTION_PER_APP = 1;
  private COMMIT_UNSELECTED_SIZE = 8;
  private COMMIT_SELECTED_SIZE = 15;

  // TODO: Use this property, only set and never read as of now
  private userSlidingWindow = null;

  private commitTreeDiv: any;

  private usedColors: Set<number[]> = new Set();
  private branchNameToLineColor: Map<string, string> = new Map();
  private branchToY: Map<string, number> = new Map();
  private branchToColor: Map<string, string> = new Map();

  // #region template-argument getters

  get highlightedMarkerColor() {
    return 'red';
  }

  private selectedCommits: Map<string, Commit[]> = new Map();
  private appNameCommitTreeMap: AppNameCommitTreeMap = new Map();

  get selectedAppName() {
    return this.args.selectedAppName;
  }

  // #endregion template-argument getters

  // #region Ember Div Events
  @action
  handleMouseEnter(plotlyDiv: any) {
    // if user hovers over plotly, save his
    // sliding window, so that updating the
    // plot won't modify his current viewport
    if (plotlyDiv && plotlyDiv.layout) {
      this.userSlidingWindow = plotlyDiv.layout;
    }
  }

  @action
  handleMouseLeave() {
    this.userSlidingWindow = null;
  }
  // #endregion

  // #region Plot Setup

  @action
  setupPlotlyCommitTreeChart(plotlyDiv: any) {
    this.debug('setupPlotlyCommitTreeChart');

    this.commitTreeDiv = plotlyDiv;

    // deep copy attributes (Map and Object is passed via reference, therefor changes in this component would actually be executed on the original element) -> nasty bugs

    this.appNameCommitTreeMap = structuredClone(this.args.appNameCommitTreeMap);
    this.selectedCommits = structuredClone(this.args.selectedCommits);

    this.usedColors.add([255, 255, 255]); // initialize with white so it won't be used as color for branches on a white background

    if (
      this.appNameCommitTreeMap &&
      this.selectedAppName &&
      this.selectedCommits
    ) {
      this.updatePlotlyCommitTree();
      this.setupPlotlyListener();
    }
  }

  private setupPlotlyListener() {
    //const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];
    const plotlyDiv = this.commitTreeDiv;

    if (plotlyDiv && plotlyDiv.layout) {
      const self: PlotlyCommitTree = this;

      // #region Click Event

      // singe click
      plotlyDiv.on('plotly_click', async (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        if (data.points[0].data.mode === 'markers') {
          // no functionality for metric circles
          return;
        }

        //console.log('data.points', data.points);

        const pn = data.points[0].pointNumber;
        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;
        const branchName = data.points[0].data.name;

        const commitId = getCommitId(branchName, pn);
        const selectedCommit: Commit = { commitId, branchName };
        //console.log('selectedCommit', selectedCommit);

        let selectedCommitsForApp =
          this.selectedCommits.get(this.selectedAppName) || [];
        const { highlightedMarkerColor } = self;

        //console.log('selectedCommitsForApp', selectedCommitsForApp);

        //console.log('before unselect selectedCommits', selectedCommits);

        if (
          isCommitAlreadySelected(
            selectedCommitsForApp,
            selectedCommit.commitId
          )
        ) {
          unselectCommit(selectedCommit, pn);
        } else {
          if (
            selectedCommitsForApp.length === this.MAX_COMMIT_SELECTION_PER_APP
          ) {
            unselectAllCommits();
          } else {
            selectCommit(selectedCommit, pn);
          }
        }

        //console.log('before click selectedCommits', selectedCommits);

        // Filter out empty selections and remove empty applications
        for (const [app, commits] of this.selectedCommits.entries()) {
          if (commits.length === 0) {
            this.selectedCommits.delete(app);
          }
        }

        this.args.setSelectedCommits(this.selectedCommits);
        this.args.triggerVizRenderingForSelectedCommits(this.selectedCommits);

        function getCommitId(branchName: string, pointNumber: number): string {
          const commitTreeForSelectedAppName = self.appNameCommitTreeMap.get(
            self.selectedAppName
          );

          if (commitTreeForSelectedAppName) {
            for (const branch of commitTreeForSelectedAppName.branches) {
              if (branch.name === branchName) {
                return branch.commits[pointNumber];
              }
            }
          }
          return '';
        }

        function isCommitAlreadySelected(
          commitList: Commit[],
          commitId: string
        ): boolean {
          return commitList.some((commit) => commit.commitId === commitId);
        }

        function unselectAllCommits() {
          self.selectedCommits.set(self.selectedAppName, []);

          const commitTreeForSelectedAppName = self.appNameCommitTreeMap.get(
            self.selectedAppName
          );

          if (commitTreeForSelectedAppName) {
            for (const branch of commitTreeForSelectedAppName.branches) {
              const curveNumber = self.branchToY.get(branch.name);
              colors = Array(branch.commits.length).fill(
                self.branchNameToLineColor.get(branch.name)
              );
              sizes = Array(branch.commits.length).fill(
                self.COMMIT_UNSELECTED_SIZE
              );
              const update = { marker: { color: colors, size: sizes } };
              Plotly.restyle(plotlyDiv, update, curveNumber);
            }
          }
        }

        function selectCommit(commit: Commit, pointNumber: number) {
          colors[pointNumber] = highlightedMarkerColor;
          sizes[pointNumber] = self.COMMIT_SELECTED_SIZE;
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);

          selectedCommitsForApp.push(commit);
          self.selectedCommits.set(self.selectedAppName, selectedCommitsForApp);
        }

        function unselectCommit(commit: Commit, pointNumber: number) {
          selectedCommitsForApp = selectedCommitsForApp.filter(
            (c) => c.commitId !== commit.commitId
          );

          //console.log('unselect selectedCommitsForApp', selectedCommitsForApp);

          colors[pointNumber] = data.points[0].fullData.line.color;
          sizes[pointNumber] = self.COMMIT_UNSELECTED_SIZE;
          if (selectedCommitsForApp.length === 0) {
            self.selectedCommits.delete(self.selectedAppName);
          } else {
            self.selectedCommits.set(
              self.selectedAppName,
              selectedCommitsForApp
            );
          }
          const update = { marker: { color: colors, size: sizes } };
          const tn = data.points[0].curveNumber;
          Plotly.restyle(plotlyDiv, update, [tn]);
        }
      });

      // #endregion
    }
  }

  // #endregion

  // #region Plot Update

  @action
  updatePlotlyCommitTree() {
    if (
      this.appNameCommitTreeMap &&
      this.selectedAppName &&
      this.selectedCommits
    ) {
      this.debug('updatePlotlyCommitTree');
      this.createPlotlyCommitTreeChart(
        this.appNameCommitTreeMap,
        this.selectedAppName,
        this.selectedCommits
      );
    }
  }

  // #endregion

  // #region Helper functions

  private getPlotlyDataObject(
    commits: number[],
    colors: string[],
    sizes: number[],
    branch: number,
    branchName: string,
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedAppName: string,
    lineColor: string
  ) {
    this.branchNameToLineColor.set(branchName, lineColor);
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
      text: this.hoverText(appNameCommitTreeMap, selectedAppName, branch),
      x: commits,
      y: Array.from(Array(commits.length)).map(() => branch),
    };
  }

  private createPlotlyCommitTreeChart(
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedAppName: string,
    selectedCommits: Map<string, Commit[]>
  ) {
    const commitTreeForSelectedAppName =
      appNameCommitTreeMap.get(selectedAppName);

    if (
      commitTreeForSelectedAppName &&
      commitTreeForSelectedAppName.branches.find(
        (branch) => branch.commits.length > 0
      )
    ) {
      // create branches
      const plotlyBranches: any[] = [];
      let branchCounter = 0;

      for (const branch of commitTreeForSelectedAppName.branches) {
        const numOfCommits = branch.commits.length;
        const offset = this.calculateOffset(selectedAppName, branch);
        const commits = Array.from(
          { length: numOfCommits },
          (_, i) => i + offset
        );
        const color = this.createColor(branch.name);
        const colors = Array.from(Array(numOfCommits)).map(() => color);
        const sizes = Array.from(Array(numOfCommits)).map(
          () => this.COMMIT_UNSELECTED_SIZE
        );

        const selectedCommitsForSelectedAppName =
          selectedCommits.get(selectedAppName);
        if (selectedCommitsForSelectedAppName) {
          this.markCommit(
            selectedCommitsForSelectedAppName,
            branch,
            colors,
            sizes
          );
        }

        const plotlyBranch = this.getPlotlyDataObject(
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
        this.branchToY.set(branch.name, branchCounter);
        this.branchToColor.set(branch.name, color);

        branchCounter++;
      }

      // add branch-to-branch connections
      for (const branch of commitTreeForSelectedAppName.branches) {
        const branchY = this.branchToY.get(branch.name);
        const branchX = this.calculateOffset(selectedAppName, branch);

        const fromBranchY = this.branchToY.get(branch.branchPoint.name);
        const fromBranchX = branchX - 1;

        if (fromBranchY !== undefined && branchY) {
          // fromBranchY can be 0 so we explicitly ask for undefined

          const color = this.branchToColor.get(branch.name)!;
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

      const layout = this.getPlotlyLayoutObject(-5, 20, -5, 5);
      this.branchToY.forEach((val, key) => {
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
        this.commitTreeDiv,
        plotlyBranches,
        layout,
        this.getPlotlyOptionsObject()
      );
    } else {
      // TODO: error text no commits
    }
  }

  private createColor(branchName: string) {
    const cloneColorMap = this.args.getCloneOfAppNameAndBranchNameToColorMap();

    let color: string | undefined = cloneColorMap.get(
      this.selectedAppName + branchName
    );
    if (!color) {
      color = this.randomRGBA();
      cloneColorMap.set(this.selectedAppName + branchName, color);
      this.args.setAppNameAndBranchNameToColorMap(cloneColorMap);
    }
    return color;
  }

  private markCommit(
    selectedCommitsForSelectedAppName: Commit[],
    branch: Branch,
    colors: string[],
    sizes: number[]
  ) {
    for (const selectedCommit of selectedCommitsForSelectedAppName) {
      const index = branch.commits.findIndex(
        (commitId) => commitId === selectedCommit.commitId
      );
      if (index !== -1) {
        colors[index] = this.highlightedMarkerColor;
        sizes[index] = this.COMMIT_SELECTED_SIZE;
      }
    }
  }

  private calculateOffset(selectedAppName: string, branch: Branch) {
    // TODO: commit can have more than one predecessor (if merged). So we need to calculate and add the maximum of both recursive calls to our counter

    const commitTreeForSelectedAppName =
      this.appNameCommitTreeMap.get(selectedAppName);

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
                counter += this.calculateOffset(selectedAppName, b);
                break;
              }
            }
            break;
          }
        }
      }
    }
    return counter;
  }

  private randomRGBA() {
    const o = Math.round,
      r = Math.random,
      s = 255;

    let red = o(r() * s);
    let green = o(r() * s);
    let blue = o(r() * s);

    let permission = false;
    while (!permission) {
      permission = true;
      for (const color of this.usedColors) {
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
    this.usedColors.add(rgb);
    return 'rgba(' + red + ',' + green + ',' + blue + ',' + '1)';
  }

  private hoverText(
    appNameCommitTreeMap: AppNameCommitTreeMap,
    selectedAppName: string,
    branch: number
  ) {
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
  }

  private getPlotlyLayoutObject(
    minRangeX: number,
    maxRangeX: number,
    minRangeY: number,
    maxRangeY: number
  ): {
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
  } {
    return {
      dragmode: 'pan',
      //   hoverdistance: 10,
      //   hovermode: 'closest',
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
  }

  private getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  }
}
