import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';

export default class SidebarHandler {
  @tracked
  openedSettingComponent: string | null = null;

  @tracked
  openedToolComponent: string | null = null;

  @tracked
  showSettingsSidebar = false;

  @tracked
  showToolsSidebar = false;

  private readonly debug = debugLogger('SidebarHandler');

  // #region Sidebars

  @action
  openSettingsSidebar() {
    this.debug('openSettingsSidebar');
    this.showSettingsSidebar = true;
  }

  @action
  closeSettingsSidebar() {
    this.debug('closeSettingsSidebar');
    this.showSettingsSidebar = false;
    this.openedSettingComponent = null;
  }

  @action
  openToolsSidebar() {
    this.debug('openToolsSidebar');
    this.showToolsSidebar = true;
  }

  @action
  closeToolsSidebar() {
    this.debug('closeToolsSidebar');
    this.showToolsSidebar = false;
    this.openedToolComponent = null;
  }

  @action
  toggleToolsSidebarComponent(component: string): boolean {
    if (this.openedToolComponent === component) {
      this.openedToolComponent = null;
    } else {
      this.openedToolComponent = component;
    }
    return this.openedToolComponent === component;
  }

  @action
  toggleSettingsSidebarComponent(component: string): boolean {
    if (this.openedSettingComponent === component) {
      this.openedSettingComponent = null;
    } else {
      this.openedSettingComponent = component;
    }
    return this.openedSettingComponent === component;
  }
}
