import Component from '@ember/component';
import layout from './template';
import { bind } from '@ember/runloop';
import { get, set, setProperties, computed } from '@ember/object';
import { inject } from '@ember/service';
import { isEqual, isEmpty, isPresent } from '@ember/utils';
import { reads } from '@ember/object/computed';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import SortableContainer from '../../classes/sortable-container';
import ScrollContainer from '../../classes/scroll-container';

const DRAGACTIONS = ['mousemove', 'touchmove'];
const DROPACTIONS = ['mouseup', 'touchend'];
const CONTEXTMENUKEYCODE = 2;
const PLACEHOLDER_BG_COLOR = '#ccc';
const SCROLL_ANIMATION_ID = '_dndContainmentScroll';

export default Component.extend({
  layout,
  classNames: ['sortable'],
  attributeBindings: ['position', 'sortable', 'isDisabled:disabled'],
  classNameBindings: ['isDragingOver:dragging-over', 'isDisabled:disabled'],
  sortable: true,
  isDisabled: false,
  sortManager: inject(),
  currentSortPane: reads('sortManager.activeSortPane'),
  activeSortPaneElement: reads('sortManager.activeSortPaneElement'),
  sourceIndex: reads('sortManager.sourceIndex'),
  targetIndex: reads('sortManager.targetIndex'),
  sortableContainer: reads('sortManager.sortableContainer'),

  isDragingOver: computed('sortManager.currentOverItem', function() {
    let currentOverItem = get(this, 'sortManager.currentOverItem');

    return isEqual(currentOverItem, this);
  }),

  documentWindow: computed(function() {
    return document.querySelector('body');
  }),

  containmentContainer: computed('containment', function() {
    if (get(this, 'containment')) {
      let containmentElement = get(this, 'element').closest(`${get(this, 'containment')}`);

      return new ScrollContainer(containmentElement, {
        containment: true,
        scrollAnimationID: SCROLL_ANIMATION_ID
      });
    }

    return null;
  }),

  // sortableContainer: computed(function() {
  //   let element = get(this, 'activeSortPaneElement') || get(this, 'element');
  //   let scrollContainer = element.closest(`${get(this, 'scrollPane')}`);

  //   return new ScrollContainer(scrollContainer);
  // }),

  init() {
    this._super(...arguments);

    assert('tagName should not be empty', isEmpty(get(this, 'tagName')));

    this._dragEventsManager = bind(this, this._dragEventsManager);
    this._onDrag = bind(this, this._onDrag);
    this._onDragover = bind(this, this._onDragover);
    this._preventDefaultBehavior = bind(this, this._preventDefaultBehavior);
    this._onMouseDown = bind(this, this._onMouseDown);
    this._tearDownDragEvents = bind(this, this._tearDownDragEvents);
    this._detachDragEventManager = bind(this, this._detachDragEventManager);
  },

  didInsertElement() {
    this._super(...arguments);

    let element = get(this, 'element')

    // element.style['touch-action'] = 'none';

    element.addEventListener('mousedown', this._onMouseDown);
    element.addEventListener('dragOver', this._onDragover);
  },

  willDestroyElement() {
    this._super(...arguments);

    let element = get(this, 'element')

    element.removeEventListener('mousedown', this._onMouseDown);
    element.removeEventListener('dragOver', this._onDragover);

    this._detachDragEventManager();
  },

  _preventDefaultBehavior(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  },

  _onMouseDown(ev) {
    if (isEqual(ev.button, CONTEXTMENUKEYCODE) || get(this, 'isDisabled')) {
      this._preventDefaultBehavior(ev);
      return;
    }

    // let handle = get(this, 'handle');

    // if (handle && !ev.target.closest(handle)) {
    //   return;
    // }

    this._preventDefaultBehavior(ev);

    DRAGACTIONS.forEach(event => window.addEventListener(event, this._dragEventsManager));
    DROPACTIONS.forEach(event => window.addEventListener(event, this._detachDragEventManager));
  },

  _dragEventsManager(ev) {
    // this._preventDefaultBehavior(ev);
    this._detachDragEventManager();

    this._cloneDraggable();

    this.sendAction('dragstart', ev);

    DRAGACTIONS.forEach(event => window.addEventListener(event, this._onDrag));
    DROPACTIONS.forEach(event => window.addEventListener(event, this._tearDownDragEvents));
  },

  _detachDragEventManager() {
    DRAGACTIONS.forEach(event => window.removeEventListener(event, this._dragEventsManager));
    DROPACTIONS.forEach(event => window.removeEventListener(event, this._detachDragEventManager));
  },

  _tearDownDragEvents() {
    DRAGACTIONS.forEach(event => window.removeEventListener(event, this._onDrag));
    DROPACTIONS.forEach(event => window.removeEventListener(event, this._tearDownDragEvents));

    this._onDrop();
  },

  _cloneDraggable() {
    let sortableContainer = new SortableContainer(get(this, 'element'));
    let cloneNode = sortableContainer.cloneNode;

    cloneNode.id = `${cloneNode.id}--clone`;
    cloneNode.style.position = 'absolute';
    cloneNode.style.width = `${sortableContainer.width}px`;
    cloneNode.style.height = `${sortableContainer.height}px`;
    cloneNode.style.left = `${sortableContainer.grabbedAt.x}px`;
    cloneNode.style.top = `${sortableContainer.grabbedAt.y}px`;
    cloneNode.style.zIndex = '9999';

    get(this, 'documentWindow').classList.add('sortable-attached');
    get(this, 'documentWindow').appendChild(cloneNode);

    setProperties(this, {
      'sortManager.sortableContainer': sortableContainer,
      'sortManager.placeholderStyles': this.getPlaceholderStyles(sortableContainer)
    });

    sortableContainer.startDrag();
  },

  getPlaceholderStyles(sortableContainer) {
    return {
      'width': `${sortableContainer.offsetWidth}px`,
      'height': `${sortableContainer.offsetHeight}px`,
      'background-color': PLACEHOLDER_BG_COLOR,
      'border-radius': sortableContainer.computedDOMStyles.borderRadius,
      'border-width': sortableContainer.computedDOMStyles.borderWidth,
      'margin': sortableContainer.computedDOMStyles.margin
    };
  },

  _onDrag(ev) {
    this._preventDefaultBehavior(ev);

    let sortableContainer = get(this, 'sortableContainer');
    let element = get(this, 'element');
    let cloneNode = get(sortableContainer, 'cloneNode');
    let activeSortPaneElement = get(this, 'activeSortPaneElement');
    let containmentContainer = get(this, 'containmentContainer');

    element.style.display = 'none';

    sortableContainer.updatePosition({
      containmentContainer
    });

    cloneNode.hidden = true;
    let elementFromPoint = document.elementFromPoint(ev.clientX, ev.clientY);
    let sortableElement, sortPaneElement;

    // Checking for elementFromPoint else will throw error
    // when dragging outside the viewport
    if (elementFromPoint) {
      sortableElement = elementFromPoint.closest('[sortable]'); // Check for not pane element (collide happens when nested sortable initialized)
      sortPaneElement = elementFromPoint.closest('[sort-pane]');
    }
    cloneNode.hidden = false;

    if (isPresent(sortableElement)) {
      const { pageX, pageY } = ev;
      let dragOverEvent = this._createEvent('dragOver', { pageX, pageY });

      if (!sortableElement.hasAttribute('disabled')) {
        sortableElement.dispatchEvent(dragOverEvent);
      }
    }

    if (isPresent(sortPaneElement)) {
      let dragEvent = this._createEvent('drag');

      if (!isEqual(activeSortPaneElement, sortPaneElement) && !sortPaneElement.hasAttribute('disabled')) {
        let dragEnterEvent = this._createEvent('dragEnter');
        // let scrollPaneElement = sortPaneElement.closest(get(this, 'scrollPane'));

        sortPaneElement.dispatchEvent(dragEnterEvent);
      }

      sortPaneElement.dispatchEvent(dragEvent);

    } else if (activeSortPaneElement) {

      let dragLeaveEvent = this._createEvent('dragLeave');

      activeSortPaneElement.dispatchEvent(dragLeaveEvent);
    }

    if (containmentContainer) {
      containmentContainer.handleScroll(sortableContainer);
    }
  },

  _onDrop() {
    this.sendAction('dragend');

    get(this, 'documentWindow').classList.remove('sortable-attached');
    get(this, 'documentWindow').removeChild(get(this, 'sortableContainer').cloneNode);
    get(this, 'element').removeAttribute('style');
    get(this, 'sortableContainer').stopDrag();

    // this.sendAction('onDrop');
    get(this, 'currentSortPane').send('onDrop', get(this, 'element'));
  },

  _onDragover(ev) {
    if (get(this, 'sortManager.isDragging')) {

      set(this, 'sortManager.currentOverItem', this);

      let element = get(this, 'element');
      let { pageY } = ev.detail;
      let { top } = element.getBoundingClientRect();
      let height = element.offsetHeight;
      let overOnTopHalf = (pageY - top) < (height / 2);
      let currentOverIndex = get(this, 'position');
      let sortManager = get(this, 'sortManager');
      let sourceList = get(sortManager, 'sourceList');
      let targetList = get(sortManager, 'targetList');
      let sourceIndex = get(this, 'sourceIndex');
      let sortAdjuster = (isEqual(sourceList, targetList) && currentOverIndex > sourceIndex) ? 1 : 0;
      let targetIndex = (overOnTopHalf ? currentOverIndex : (currentOverIndex + 1)) - sortAdjuster;

      setProperties(sortManager, {
        overOnTopHalf,
        currentOverIndex,
        targetIndex
      });

      this.sendAction('onDragover');
    }
  },

  _createEvent(eventType = 'MyCustomEvent', options = {}) {
    let defaults = {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: options
    };
    let mergedOptions = assign({}, defaults);

    return new CustomEvent(eventType, mergedOptions);
  }
});
