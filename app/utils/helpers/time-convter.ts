/**
 * Converts a string to a number as date
 * @param date has format `yyyy-MM-dd`
 * @returns
 */

export default function convertDate(date: string) {
  const day = date.slice(8, date.length);
  const month = date.slice(5, 7);
  const year = date.slice(0, 4);

  // returns always a months ahead. Therefore, substract one month.
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day))
  ).valueOf();
}
