import ComponentOpener from
'react-lib/src/components/visualization/page-setup/sidebar/component-opener.tsx';
import react from 'explorviz-frontend/modifiers/react';

<template>
  <div
    {{react
      ComponentOpener
      openedComponent=@openedComponent
      componentTitle='Settings'
      componentId='Settings'
      toggleComponent=@toggleSettingsSidebarComponent
    }}
  />
</template>