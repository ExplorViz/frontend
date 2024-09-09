import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';

export default class SidebarHandler {
  @tracked
  components: string[] = [];

  @tracked
  componentsToolsSidebar: string[] = [];

  @tracked
  showSettingsSidebar = false;

  @tracked
  showToolsSidebar = false;

  private readonly debug = debugLogger('SidebarHandler');

  // #region Sidebars

  @action
  closeDataSelection() {
    this.debug('closeDataSelection');
    this.showSettingsSidebar = false;
    this.components = [];
  }

  @action
  closeToolsSidebar() {
    this.debug('closeToolsSidebar');
    this.showToolsSidebar = false;
    this.componentsToolsSidebar = [];
  }

  @action
  openSettingsSidebar() {
    this.debug('openSettingsSidebar');
    this.showSettingsSidebar = true;
  }

  @action
  openToolsSidebar() {
    this.debug('openToolsSidebar');
    this.showToolsSidebar = true;
  }

  @action
  toggleToolsSidebarComponent(component: string): boolean {
    if (this.componentsToolsSidebar.includes(component)) {
      this.componentsToolsSidebar = [];
    } else {
      this.componentsToolsSidebar = [component];
    }
    return this.componentsToolsSidebar.includes(component);
  }

  @action
  toggleSettingsSidebarComponent(component: string): boolean {
    if (this.components.includes(component)) {
      this.components = [];
    } else {
      this.components = [component];
    }
    return this.components.includes(component);
  }
}
