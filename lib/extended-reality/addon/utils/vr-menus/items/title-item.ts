import TextItem from './text-item';
import { ItemArgs } from './item';

export const TITLE_FONT_SIZE = 50;
export const TITLE_TEXT_COLOR = '#ffffff';
export const TITLE_TEXT_ALIGNMENT = 'center';
export const TITLE_TEXT_BASELINE = 'top';

export type TitleItemArgs = ItemArgs & {
  text: string;
};

export default class TitleItem extends TextItem {
  constructor(args: TitleItemArgs) {
    super({
      fontSize: TITLE_FONT_SIZE,
      color: TITLE_TEXT_COLOR,
      alignment: TITLE_TEXT_ALIGNMENT,
      baseline: TITLE_TEXT_BASELINE,
      ...args,
    });
  }
}
