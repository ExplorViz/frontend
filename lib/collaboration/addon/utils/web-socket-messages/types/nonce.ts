export type Nonce = number;

export function isNonce(nonce: any): nonce is Nonce {
  return typeof nonce === 'number';
}
