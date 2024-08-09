import Component from '@glimmer/component';

export interface GenericPopupData {
    title: string,
    tabs: GenericPopupDataTab[] | null
    entries: GenericPopupDataEntry[] | null
}

export interface GenericPopupDataTab {
    title: string,
    content: string | null
    entries: GenericPopupDataEntry[] | null
}

export interface GenericPopupDataEntry {
    key: string,
    value: string
}

interface Args {
    data: GenericPopupData
}

export default class GenericPopup extends Component<Args> {
}