import { TypeOfAnalysis } from 'react-lib/src/utils/landscape-schemes/structure-data';

export default function isValidPopupSection(
  typeOfPopup: string,
  originOfData: TypeOfAnalysis
) {
  if (!typeOfPopup || !originOfData) {
    return false;
  }

  return originOfData.includes(typeOfPopup);
}
