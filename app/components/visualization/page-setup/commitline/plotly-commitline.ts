import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import { Branch, EvolutionLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import Plotly from 'plotly.js-dist';

interface IMarkerStates {
  [commitId: string]: {
    color: string;
    size: number;
    emberModel: SelectedCommit;
  };
}

interface IArgs {
  evolutionData?: EvolutionLandscapeData;
  selectedApplication?: string;
  selectedCommits?: Map<string,Map<string,SelectedCommit[]>>; // outer key is application id, inner key is branch name
  highlightedMarkerColor?: string;
  setChildReference?(timeline: PlotlyCommitline): void;
  clicked?(selectedApplication: string, selectedCommits: Map<string,SelectedCommit[]>): void;
}

export default class PlotlyCommitline extends Component<IArgs> {

    private MAX_SELECTION = 2;

    // BEGIN template-argument getters 
 
  get highlightedMarkerColor() {
    return this.args.highlightedMarkerColor || 'red';
  }


  get evolutionData() {
    return this.args.evolutionData;
  }

  get selectedApplication() {
    return this.args.selectedApplication;
  }

  get selectedCommits() {
    return this.args.selectedCommits;
  }

  // END template-argument getters

  readonly debug = debugLogger();

  oldPlotlySlidingWindow = { min: 0, max: 0 };

  userSlidingWindow = null;

  markerState: IMarkerStates = {};

  commitlineDiv: any;

  branchToY: Map<string,number> = new Map();
  branchToColor: Map<string,string> = new Map();
  commitSizes: Map<string, number> = new Map();
  branchNameToLineColor: Map<string, string> = new Map();
  usedColors: Set<number[]> = new Set();
  

  maxCommits = 0;

  // BEGIN Ember Div Events
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
  // END Ember Div Events

  @action
  didRender(plotlyDiv: any) {
    // register this component at its parent if set via template
    const parentFunction = this.args.setChildReference;
    if (parentFunction) {
      parentFunction(this);
    }

    this.commitlineDiv = plotlyDiv;
    const evolutionData = this.evolutionData;
    const application = this.selectedApplication;
    const selectedCommits = this.selectedCommits;
    this.usedColors.add([255,255,255]); // initialize with white so it won't be used as color for branches on a white background
    if(evolutionData && application && selectedCommits) {
        this.computeSizes(evolutionData, application);
        this.createPlotlyCommitlineChart(evolutionData, application, selectedCommits);
        this.setupPlotlyListener(evolutionData, application,selectedCommits);
    }
  }

  setupPlotlyListener(evolutionData: EvolutionLandscapeData, selectedApplication: string, selectedCommits: Map<string,Map<string,SelectedCommit[]>>) {
    const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];
    const plotlyDiv = this.commitlineDiv;

    if (plotlyDiv && plotlyDiv.layout) {
      const self: PlotlyCommitline = this;

      // singe click
      plotlyDiv.on('plotly_click', (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        const pn = data.points[0].pointNumber;
        const numberOfPoints = data.points[0].fullData.x.length;

        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;

        const branchName = data.points[0].data.name;

        const applicationSelectedCommits = selectedCommits.get(selectedApplication)!;


        // add selected commit

        let commitId = "";
        for (const application of evolutionData.applications) {
            if(application.name === selectedApplication ) {
                for(const branch of application.branches) {
                    if(branch.name === branchName){
                        commitId = branch.commits[pn];
                    break;
                    }
                }
                break;
            }
        }

          const selectedCommit : SelectedCommit = {
            commitId: commitId,
            branchName: branchName
          };

          let selectedCommitList  = applicationSelectedCommits?.get(branchName);
          const { highlightedMarkerColor } = self;

          if(selectedCommitList){
            let isSelected = false;
            for( const selCom of selectedCommitList ) {
                if (selCom.commitId  === selectedCommit.commitId){
                    isSelected = true;
                    break;
                }
            }

            console.log("isSelected:",isSelected);

    
            if(!isSelected){ // select
                console.log("select");
                selectedCommitList.push(selectedCommit);
                applicationSelectedCommits.set(branchName, selectedCommitList);
                colors[pn] = highlightedMarkerColor;
            }else { // unselect 
                selectedCommitList = selectedCommitList.filter((commit => { return commit.commitId !== selectedCommit.commitId}));
                colors[pn] = data.points[0].fullData.line.color;

                if(selectedCommitList.length > 0)
                    applicationSelectedCommits.set(branchName, selectedCommitList);
                else
                    applicationSelectedCommits.delete(branchName);
            }
          }else {
            console.log("select first in branch");
            colors[pn] = highlightedMarkerColor;
            applicationSelectedCommits.set(branchName, [selectedCommit]);
          }

          //     // reset old selection, since maximum selection value is achieved
    //     // and user clicked on a new point

    
        let numberOfSelections = 0;
        for (const application of evolutionData.applications) {
            if(application.name === selectedApplication ) {
                for(const branch of application.branches) {
                    const branchSelectedCommits = applicationSelectedCommits?.get(branch.name);
                    if(branchSelectedCommits){
                    numberOfSelections += branchSelectedCommits.length;
                    }
                }
                break;
            }
        }

         if (numberOfSelections > this.MAX_SELECTION) {

            for (const application of evolutionData.applications) {
                if(application.name === selectedApplication ) {
                    for(const branch of application.branches) {
                        const branchSelectedCommits = applicationSelectedCommits?.get(branch.name);
                        if(branchSelectedCommits){
                            applicationSelectedCommits.delete(branch.name);
                        }
                    }
                    break;
                }
            }
            // unselect all
            console.log("unselect ALL");
            for (const application of evolutionData.applications) {
                if(application.name === selectedApplication ) {
                    let j = 0;
                    for(const branch of application.branches) {
                        const curveNumber = this.branchToY.get(branch.name);
                        colors = Array(branch.commits.length).fill(this.branchNameToLineColor.get(branch.name));
                        sizes = Array(branch.commits.length).fill(this.commitSizes.get(branch.name));
                        const update = { marker: { color: colors, size: sizes} };
                        Plotly.restyle(plotlyDiv, update, curveNumber);
                    }
                    break;
                }
            }
                       
            
         } else {
            const update = { marker: { color: colors, size: sizes } };
            const tn = data.points[0].curveNumber;
            Plotly.restyle(plotlyDiv, update, [tn]);
         }



    //     // Check if component should pass the selected timestamps
    //     // to its parent
    //     if (self.selectionCount > 1) {
    //       if (self.selectedTimestamps.length === self.selectionCount) {
    //         // closure action
    //         if (self.args.clicked) self.args.clicked(self.selectedTimestamps);
    //       }
    //     } else if (self.args.clicked) {
    //       // closure action
    //       self.args.clicked(self.selectedTimestamps);
    //     }
       });


       //   // double click
    //   plotlyDiv.on('plotly_doubleclick', () => {
    //     const { min, max } = self.oldPlotlySlidingWindow;
    //     const update = PlotlyTimeline.getPlotlySlidingWindowUpdateObject(
    //       min,
    //       max
    //     );
    //     Plotly.relayout(plotlyDiv, update);
    //   });

    //   // Show cursor when hovering data point
    //   if (dragLayer) {
    //     plotlyDiv.on('plotly_hover', () => {
    //       dragLayer.style.cursor = 'pointer';
    //     });

    //     plotlyDiv.on('plotly_unhover', () => {
    //       dragLayer.style.cursor = '';
    //     });

    //     plotlyDiv.on('plotly_relayouting', () => {
    //       // if user drags the plot, save his
    //       // sliding window, so that updating the
    //       // plot won't modify his current viewport
    //       if (plotlyDiv && plotlyDiv.layout) {
    //         self.userSlidingWindow = plotlyDiv.layout;
    //       }
    //     });
       //}



    }
    

    
  }

  createPlotlyCommitlineChart(evolutionData: EvolutionLandscapeData, selectedApplication: string, selectedCommits: Map<string,Map<string,SelectedCommit[]>>) {
    if(evolutionData.applications.find(application => application.name === selectedApplication)) { 


        if(!selectedCommits.get(selectedApplication)){
            selectedCommits.set(selectedApplication, new Map());
        }

        // TODO: used old colors after switching back from timeline or other applications commitline

        // create branches
        let plotlyBranches: any[] = [];
        let branchCounter = 0;

        for (const application of evolutionData.applications) {
            if(application.name === selectedApplication ) {
                for(const branch of application.branches) {

                    const numOfCommits = branch.commits.length;
                    

                    
                    const offset = this.calculateOffset(selectedApplication, branch);
                    const commits = Array.from({length: numOfCommits}, (_, i) => i + offset);

                    let color = this.randomRGBA();

                    const colors = Array.from(Array(numOfCommits)).map(() => color);
                    const sizes = Array.from(Array(numOfCommits)).map(() => 10);

                    console.log("SIZES:",sizes);
                    const plotlyBranch = this.getPlotlyDataObject(commits,colors,sizes,branchCounter, branch.name);
                    plotlyBranches.push(plotlyBranch);
                    this.branchToY.set(branch.name, branchCounter);
                    this.branchToColor.set(branch.name, color);

                    branchCounter++;
                }
                break;
            }
        }

        // add branch to branch connections

        for (const application of evolutionData.applications) {
            if(application.name === selectedApplication ) {
                for(const branch of application.branches) {

                    const branchY = this.branchToY.get(branch.name);
                    const branchX = this.calculateOffset(selectedApplication, branch);

                    const fromBranchY = this.branchToY.get(branch.branchPoint.name);
                    const fromBranchX = branchX - 1;

                    if (fromBranchY !== undefined){ // fromBranchY can be 0 so we explicitly ask for undefined
            
                        const color = this.branchToColor.get(branch.name)!;
                        plotlyBranches.push({
                            line: { color: color, width: 2},
                            mode: 'lines',
                            type: 'scatter',
                            name: branch.name,
                            x: [fromBranchX, branchX],
                            y: [fromBranchY, branchY]
                        });
                    }
                }
                break;
            }
        }

         //TODO: restore selected commits

        const layout = PlotlyCommitline.getPlotlyLayoutObject(0,50);
        this.branchToY.forEach((val, key) => {
            layout.annotations.push({
                xref: 'paper',
                x: 0.05,
                y: val,
                xanchor: 'right',
                yanchor: 'middle',
                text: key,
                showarrow: false,
                font: {
                  family: 'Arial',
                  size: 16,
                  color: 'black'
                }
              });
        });

        Plotly.newPlot(
            this.commitlineDiv,
            plotlyBranches,
            layout,
            PlotlyCommitline.getPlotlyOptionsObject()
          );

        this.calculateSelectedCommits(evolutionData, selectedApplication, "main", selectedCommits);

    }else {
        // TODO: error text no commits
        console.log("No commits available yet");
    }
  }

  calculateOffset(selectedApplication: string, branch: Branch) {

    const evolutionData = this.evolutionData!; // evolutionData not undefined, otherwise calculateOffset wouldn't be called
    let counter = 0;
    for (const application of evolutionData.applications) {
        if(application.name === selectedApplication){

            const fromCommit = branch.branchPoint.commit;
            const fromBranch = branch.branchPoint.name;

            if(fromBranch !== "NONE")
            {
                for(const b of application.branches) {
                    if (b.name === fromBranch){
                        for(const commit of b.commits){
                            counter++;
                            if(commit === fromCommit){
                                counter += this.calculateOffset(selectedApplication, b);
                                break;
                            }
                        }
                        break;
                    }
                }
    
            }
            break;   
        }
    }
    return counter;
  }

  calculateSelectedCommits(evolutionData: EvolutionLandscapeData, selectedApplication: string, involvedBranch: string, selectedCommits: Map<string,Map<string,SelectedCommit[]>>) {

    const chainsWithInvolvedBranch = this.getListOfFullBranchPaths(evolutionData, selectedApplication, involvedBranch);
    console.log(chainsWithInvolvedBranch);
 

    // let counter = 0;
    // for (const application of evolutionData.applications) {
    //     if(application.name === selectedApplication){

    //         const applicationSelectedCommits = selectedCommits.get(selectedApplication);
            
    //         // current branch selected commits
    //         const branchSelectedCommits = applicationSelectedCommits?.get(branch.name);
    //         if(branchSelectedCommits){
    //             counter += branchSelectedCommits.length;
    //         }

    //         branch.commits.forEach(commit => {
    //             if(applicationSelectedCommits?.get(branch.name)){
    //                 counter += applicationSelectedCommits?.get(commit)?.length;
    //             }
    //         });

    //         const fromCommit = branch.branchPoint.commit;
    //         const fromBranch = branch.branchPoint.name;

    //         if(fromBranch !== "NONE")
    //         {
    //             for(const b of application.branches) {
    //                 if (b.name === fromBranch){
    //                     for(const commit of b.commits){
    //                         counter++;
    //                         if(commit === fromCommit){
    //                             counter += this.calculateOffset(selectedApplication, b);
    //                             break;
    //                         }
    //                     }
    //                     break;
    //                 }
    //             }
    
    //         }
    //         break;   
    //     }
    // }
    // return counter;
  }

  // TODO: needed?
  // returns the list of branch paths that contain involvedBranch. A branch path starts with the origin branch and ends with a branch with no branch points (except the one it originates from) 
  getListOfFullBranchPaths(evolutionData: EvolutionLandscapeData, selectedApplication: string, involvedBranch: string){
    const setOfBranches = new Set<string>();
    setOfBranches.add("NONE");
    let listOfChains = [];
    for (const application of evolutionData.applications) {
        if(application.name === selectedApplication){
            //const numberOfBranches = application.branches.length;
            let involvedBranchFound = false;
            let done = false;

            let addToSet: string[] = []; // used for DFS
            let currentChain : string[] = [];
            let ignorableBranches : string[] = [];
            let noNewCandidate = false;
            let involvedBranchFoundFirstTime = true;
            while(/*setOfBranches.size - 1 !== numberOfBranches*/ !done){
                let counter = 0;

                for (const branch of application.branches) { // candidate branches for DFS
                    if(setOfBranches.has(branch.branchPoint.name) && !setOfBranches.has(branch.name) && !addToSet.includes(branch.name) && !ignorableBranches.includes(branch.name) ){
                        
                        // found a new candidate 

                        counter++;
                        if(branch.name === involvedBranch){
                            involvedBranchFound = true; 
                        }else {
                            addToSet = [branch.name, ...addToSet];
                        }
                    }
                }

                if(counter > 0){ // we are not done with DFS for the current chain
                    if(involvedBranchFound && involvedBranchFoundFirstTime){
                        involvedBranchFoundFirstTime = false;
                        ignorableBranches = addToSet.slice(0); // copy. Note that especially all "sibling" branches are ignored
                        addToSet = [involvedBranch];
                    }

                    const nextBranch = addToSet[0]; // next branch for DFS
                    addToSet = addToSet.slice(1); 
                    currentChain.push(nextBranch);
                    setOfBranches.add(nextBranch);
                }else { // no new candidate found. Our current chain has reached its end

                    if(!noNewCandidate){
                        noNewCandidate = true;
                    }
                    else {
                        done = true;
                        break;
                    }

                    if(involvedBranchFound){
                        listOfChains.push(currentChain);
                    }

                    if(addToSet.length > 0){ 
                        noNewCandidate = false; // prevent done=true when we reach a chains end 

                        // backtracking
                       let resetChainEnd = "";

                       for (const app of evolutionData.applications) {
                        if(app.name === selectedApplication){
                            for (const b of app.branches){
                                if(b.name === addToSet[0]){
                                    resetChainEnd = b.branchPoint.name;
                                    break;
                                }
                            }
                        }
                        break;
                    }

                    const index = currentChain.findIndex(branchName => branchName === resetChainEnd);
                    currentChain = currentChain.slice(0,index+1);
                    
                    const nextBranch = addToSet[0];
                    addToSet = addToSet.slice(1);
                    currentChain.push(nextBranch);
                    }
                    
                }
            }
            

            break;
        }
    }
    return listOfChains;
  }

  computeSizes(evolutionData: EvolutionLandscapeData, selectedApplication: string){
    for (const application of evolutionData.applications) {
        if(application.name === selectedApplication){
            for(const branch of application.branches){
                // TODO: size anhängig von änderungen
                this.commitSizes.set(branch.name, 10);
            }
            break;
        }
    }
  }


   getPlotlyDataObject(
    commits: number[],
    colors: string[],
    sizes: number[],
    branch: number,
    branchName: string,
  ) {
      this.branchNameToLineColor.set(branchName, colors[0]);
      return {
        name: branchName,
        marker: { color: colors, size: sizes },
        line: { color: colors[0], width: 2},
        mode: 'lines+markers',
        type: 'scatter',
        text: PlotlyCommitline.hoverText(),
        x: commits,
        y: Array.from(Array(commits.length)).map(() => branch)
      };
  }

  static getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  }

  static getPlotlyLayoutObject(minRange: number, maxRange: number) : {
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
        b: 40,
        pad: 5,
        t: 20,
        r: 40,
      },
      xaxis: {
        range: [minRange,maxRange],
        showline: false,
        showgrid: false,
        showticklabels: false,
      },
    
      yaxis: {
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
      annotations: []
      
      
      //,
    //   xaxis: {
    //     title: {
    //       font: {
    //         color: '#7f7f7f',
    //         size: 16,
    //       },
    //       text: 'Commit',
    //     },
    //   },
    //   yaxis: {
    //     fixedrange: true,
    //     title: {
    //       font: {
    //         color: '#7f7f7f',
    //         size: 16,
    //       },
    //       text: 'Branch',
    //     },
    //   },
    };
  }

  static hoverText() {
    console.log("hover");
  }


    randomRGBA() {
        const o = Math.round, r = Math.random, s = 255;

        let red = o(r()*s);
        let green = o(r()*s);
        let blue = o(r()*s);

        let permission = false;
        while(!permission) {
            permission = true;
            for (const color of this.usedColors){ // only use darker colors (prevent white on white background)
                const diff = Math.abs(color[0] - red) + Math.abs(color[1] - green) + Math.abs(color[2] - blue);
                if (diff < 20) { // prevent to use colors that look very similiar
                    red = o(r()*s);
                    green = o(r()*s);
                    blue = o(r()*s);
                    permission = false;
                    break;
                }
            }
        }
        let rgb = [red,green,blue];
        this.usedColors.add(rgb);
        return 'rgba(' + red + ',' + green + ',' + blue + ',' + '1)';
    }

}
