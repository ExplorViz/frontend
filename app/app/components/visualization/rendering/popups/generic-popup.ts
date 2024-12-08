import Component from '@glimmer/component';

export interface GenericPopupData {
  title: string;
  tabs: GenericPopupDataTab[] | null;
  entries: GenericPopupDataEntry[] | null;
}

export interface GenericPopupDataTab {
  title: string;
  content: string | null;
  entries: GenericPopupDataEntry[] | null;
}

export interface GenericPopupDataEntry {
  key: string;
  value: string;
}

interface Args {
  data: GenericPopupData;
}

export default class GenericPopup extends Component<Args> {}

export function GenericPopupEntiresFromObject(
  object: any
): GenericPopupDataEntry[] {
  const entries = Object.entries(object);
  return entries.map((e) => {
    return {
      key: e[0],
      value: e[1],
    } as GenericPopupDataEntry;
  });
}
