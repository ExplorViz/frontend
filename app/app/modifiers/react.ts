import Modifier, { NamedArgs, PositionalArgs } from 'ember-modifier';
import { Root, createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { registerDestructor } from '@ember/destroyable';

interface Sig {
  Element: HTMLElement;
  Args: {
    Positional: [reactComponent: React.FC];
    Named: Parameters<typeof createElement>[1];
  };
}

export default class ReactModifier extends Modifier<Sig> {
  root: Root | null = null;

  modify(
    element: Element,
    [reactComponent]: PositionalArgs<Sig>,
    props: NamedArgs<Sig>
  ) {
    if (!this.root) {
      this.root = createRoot(element);
      registerDestructor(this, () => this.root?.unmount());
    }
    this.root.render(createElement(reactComponent, { ...props }));
  }
}
