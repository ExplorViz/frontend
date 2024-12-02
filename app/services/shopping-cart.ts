import Service from '@ember/service';

export default class ShoppingCartService extends Service {}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:shopping-cart')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('shopping-cart') declare altName: ShoppingCartService;`.
declare module '@ember/service' {
  interface Registry {
    'shopping-cart': ShoppingCartService;
  }
}
