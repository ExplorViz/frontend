// Types for compiled templates
declare module 'explorviz-frontend/templates/*' {

  import { TemplateFactory } from 'htmlbars-inline-precompile';

  const tmpl: TemplateFactory;
  export default tmpl;
}

declare module 'plotly.js-dist';
