

export interface SemanticZoomableObject{
  // number i is == 0 if not shown
  //              > 0 if appearence selected
  //              < 0 Ignored
  showAppearence(i: number): boolean
  getCurrentAppearenceLevel(): number
  setAppearence(i:number, ap: Appearence): void
  
  // TOD: might want to move this function into the Appearence class!
  setCallbackfunctionForAppearence(i: number, fn: () => void): void


}

class Appearence{
  // is like a recepie to tell the original/base 3d Object how to change
}

class AppearenceExtension extends Appearence{
  // can be used to add further Objects to the appearence level of a `SemanticZoomableObject`
}


export default class SemanticZoomManager{

}