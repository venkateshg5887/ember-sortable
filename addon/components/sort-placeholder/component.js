import Component from '@ember/component';
import layout from './template';
import { bind, scheduleOnce } from '@ember/runloop';
import { get, setProperties } from '@ember/object';
import { inject } from '@ember/service';
import { capitalize } from '@ember/string';

export default Component.extend({
  layout,
  classNames: ['droppable'],

  didInsertElement() {
    this._super(...arguments);
    let element = this.get('element');
    let events = ['drop', 'dragover', 'dragenter'];

    // Registering Events
    events.forEach((event) => {
      element.addEventListener(event, bind(this, `_on${capitalize(event)}`));
    });
  },

  _onDrop(ev) {
    this.sendAction('onDrop', ev);
  },
  _onDragenter(ev) {
    ev.preventDefault();
  },
  _onDragover(ev) {
    ev.preventDefault();
  }
});
