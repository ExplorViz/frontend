import { helper } from '@ember/component/helper';

export function accessArrayElement([array, index]: [any[] | undefined, number]) {
    if(array)
        return array[index];
    else
        return undefined;
}

export default helper(accessArrayElement);