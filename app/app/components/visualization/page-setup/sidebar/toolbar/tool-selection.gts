import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import SidebarResizer from 'react-lib/src/components/visualization/page-setup/sidebar/sidebar-resizer.tsx';
import svgJar from 'ember-svg-jar/helpers/svg-jar';
import react from 'explorviz-frontend/modifiers/react';

export default class ToolSelection extends Component<IArgs> {
  <template>
    <div class='sidebar-card-container pr-3 pl-3 pb-3'>
      {{yield}}
    </div>
    <div id='toolsSidebarButtonContainer' class='foreground'>
      <button
        type='button'
        class='btn btn-light btn-outline-dark sidebar-button'
        title='Close Sidebar'
        aria-label='Close'
        {{on 'click' @closeToolSelection}}
      >
        {{svgJar 'x-16' class='octicon align-middle'}}
      </button>
      <div
        {{react
          SidebarResizer
          buttonName='toolSidebarDragButton'
          containerName='toolsSidebarButtonContainer'
          sidebarName='toolselection'
          expandToRight=true
        }}
      />
    </div>
  </template>
}
