/**
 * Converts a time value given in nanoseconds since the Unix epoch to
 * a date in the user's local timezone as used by datetime-local inputs.
 *
 * Note: Since datetime-local input values do not have nanosecond precision,
 * this is a lossy conversion. The resulting value has millisecond precision.
 *
 * Returns an empty string for undefined values.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Date_and_time_formats#local_date_and_time_strings|MDN Web Docs}
 */
export function unixNanosecondsToDatetimeLocal(ns: bigint | undefined) {
  if (ns === undefined) {
    return '';
  }

  const date = new Date(Number(ns / 1_000_000n));
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const millis = date.getMilliseconds().toString().padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}`;
}

/**
 * Converts a time value as used by datetime-local type inputs to the
 * corresponding value given in nanoseconds since
 *
 * Note: Datetime-local input values only have millisecond precision,
 * therefore the exact nanosecond information cannot be extracted.
 * The result is a simple conversion from the millisecond value.
 *
 * Returns undefined if the provided string is empty or not a valid date.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Date_and_time_formats#local_date_and_time_strings|MDN Web Docs}
 */
export function datetimeLocalToUnixNano(value: string): bigint | undefined {
  if (value === '') {
    return undefined;
  }

  try {
    const unixNano = BigInt(new Date(value.toString()).getTime()) * 1_000_000n;
    return unixNano;
  } catch (error) {
    return undefined;
  }
}
