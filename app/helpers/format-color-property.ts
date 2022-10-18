import { helper } from '@ember/component/helper';

export function formatColorProperty(params: String[]) {
  let [property] = params;
  if (typeof property === 'string' && property.length > 0) {
    property = property.replace(
      /[A-Z]/g,
      (upperCaseLetter) => ` ${upperCaseLetter}`
    );
    property = property.charAt(0).toUpperCase() + property.slice(1);
  } else {
    property = '';
  }

  return property;
}

export default helper(formatColorProperty);
