import { helper } from '@ember/component/helper';

export function timestampToDate([timestamp, format]: [number, string]) {
  const date = new Date(timestamp);

  let formattedDate;
  if (format === 'time') {
    const hours = date.getHours();
    const minutes = `0${date.getMinutes()}`;
    const seconds = `0${date.getSeconds()}`;

    formattedDate = `${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`;
  } else if (format === 'localString') {
    formattedDate = date.toLocaleString();
  } else {
    formattedDate = date.toString();
  }

  return formattedDate;
}

export default helper(timestampToDate);
