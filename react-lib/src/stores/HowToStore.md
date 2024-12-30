# How to replace services / global states?

We will first migrate the attributes of the Ember services into zustand stores.

1. For now, only use zustand for global states such as Ember services. 
2. (Glimmer tracked will also be migrated with zustand, but not before the corresponding components are migrated to react)
3. In most cases the example below will be sufficient for the first migration step

## Why stepwise?
With this approach, we have the global states already migrated when it comes to moving the underlying logic to react. In most cases this enables us to only use a 'native' TS file for the services which will then using the same stores as the already 'half-migrated' Ember service did. Hopefully the migration of most of the Ember services after zustand will only be a 'Copy/Paste' into react.

## Example:
We use ```~``` for placeholder.

### Old service:
In app/app/services/ :
```
// Import block
...

// attribute block
attributeA: typeA;
attributeB: typeB;
attributeC: typeC | undefined;

// logic block
...
```

### Store:
In react-lib/src/store/ :
```
import { createStore } from 'zustand/vanilla';

interface ~StoreName~State {
    attributeA: typeA;
    attributeB: typeB;
    attributeC: typeC | undefined;
}

export const use~StoreName~Store = createStore<~StoreName~State>(() => ({
    attributeA: typeAValue,
    attributeB: typeBValue,
    attributeC: typeCValue,
}));
```

### New service:
In app/app/services/ :
```
// Import block
import { use~StoreName~Store } from 'react-lib/src/stores/~StoreFile~';
...

// attribute block
get attributeA(): typeA {
    return use~StoreName~Store.getState().attributeA;
}

set attributeA(value: typeA) {
    use~StoreName~Store.setState({ attributeA: value });
}


get attributeB(): typeB {
    return use~StoreName~Store.getState().attributeB;
}

set attributeB(value: typeB) {
    use~StoreName~Store.setState({ attributeB: value });
}

get attributeC(): typeC {
    return use~StoreName~Store.getState().attributeC;
}

set attributeC(value: typeC) {
    use~StoreName~Store.setState({ attributeC: value });
}

// logic block
...
