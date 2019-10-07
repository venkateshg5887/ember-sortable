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

export default Component.extend({
  layout,
  attributeBindings: ['position', 'sortable'],
  classNames: ['sortable'],
  sortable: true,
  isDisabled: false,
  sortManager: inject(),
  currentSortPane: reads('sortManager.activeSortPane'),
  currentSortPaneElement: reads('sortManager.sortPaneElement'),
  sourceIndex: reads('sortManager.sourceIndex'),
  targetIndex: reads('sortManager.targetIndex'),
  isDragEntered: false,

  containmentContainer: computed('containment', 'hackContainment', function() {
    if (get(this, 'containment')) {
      let containmentElement = get(this, 'element').closest(`${get(this, 'containment')}`);

      return new ScrollContainer(containmentElement, { containment: !(get(this, 'hackContainment')) });
    }

    return null;
  }),
  scrollContainer: computed('scrollPane', 'currentSortPaneElement', function() {
    let element = get(this, 'currentSortPaneElement') || get(this, 'element');
    let scrollContainer = element.closest(`${get(this, 'scrollPane')}`);

    return new ScrollContainer(scrollContainer);
  }),

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
    this._handleScroll = bind(this, this._handleScroll);
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
    let sortableElement = get(this, 'element');
    let sortableContainer = new SortableContainer(sortableElement);
    let cloneNode = sortableContainer.cloneNode;

    cloneNode.id = `${cloneNode.id}--clone`;
    cloneNode.style.position = 'absolute';
    cloneNode.style.width = `${sortableContainer.width}px`;
    cloneNode.style.height = `${sortableContainer.height}px`;
    cloneNode.style.left = `${sortableContainer.grabbedAt.x}px`;
    cloneNode.style.top = `${sortableContainer.grabbedAt.y}px`;
    cloneNode.style.zIndex = '9999';

    let documentBody = document.getElementsByTagName('body')[0];

    documentBody.appendChild(cloneNode);

    setProperties(this, {
      'sortableContainer': sortableContainer,
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
    let sortableElement = get(this, 'element');
    let cloneNode = get(sortableContainer, 'cloneNode');
    let sortManager = get(this, 'sortManager');
    let currentSortPane = get(sortManager, 'sortPaneElement');
    let containmentContainer = get(this, 'containmentContainer');

    sortableElement.style.display = 'none';

    sortableContainer.updatePosition({
      containmentContainer
    });

    cloneNode.hidden = true;
    let elementFromPoint = document.elementFromPoint(ev.clientX, ev.clientY);
    let sortabble, sortPane;

    if (elementFromPoint) {
      sortabble = elementFromPoint.closest('[sortable]'); // Check for not pane element (collide happens when nested sortable initialized)
      sortPane = elementFromPoint.closest('[sort-pane]');
    }
    cloneNode.hidden = false;

    // This should not be css class dependent
    // should be an attribute and readOnly
    if (isPresent(sortabble)) {
      const { pageX, pageY } = ev;
      let dragOverEvent = this._createEvent('dragOver', { pageX, pageY });

      sortabble.dispatchEvent(dragOverEvent);
    }

    // This should not be css class dependent
    // should be an attribute and it should be readOnly
    if (isPresent(sortPane)) {

      cancelAnimationFrame(this.paneScroll);

      if (isEqual(currentSortPane, sortPane) && !get(this, 'isDragEntered')) {
        let dragEnterEvent = this._createEvent('dragEnter');
        // let sortPaneElement = elementFromPoint.closest(get(this, 'scrollPane'));

        sortPane.dispatchEvent(dragEnterEvent);
        set(this, 'isDragEntered', true);

      } else if (!isEqual(currentSortPane, sortPane) && get(this, 'isDragEntered')) {
        let dragLeaveEvent = this._createEvent('dragLeave');

        currentSortPane.dispatchEvent(dragLeaveEvent);
        set(this, 'isDragEntered', false);
      }

      set(sortManager, 'sortPaneElement', sortPane);

      this._handleScroll(sortableContainer, get(this, 'scrollContainer'), 'paneScroll');
    }

    if (containmentContainer) {
      cancelAnimationFrame(this.containmentContainerScroll);
      this._handleScroll(sortableContainer, containmentContainer, 'containmentContainerScroll');
    }
  },

  _handleScroll(sortableContainer, scrollContainer, scrollAnimationQueue) {
    let vScrollProgress = scrollContainer.clientHeight + scrollContainer.scrollTop;
    let hScrollProgress = scrollContainer.clientWidth + scrollContainer.scrollLeft;
    let isNotReachedUp = scrollContainer.scrollTop > 0;
    let isNotReachedDown = vScrollProgress < scrollContainer.scrollHeight;
    let isNotReachedLeft = scrollContainer.scrollLeft > 0;
    let isNotReachedRight = hScrollProgress < scrollContainer.scrollWidth;

    if (scrollContainer.maxScrollHeight) {

      if (sortableContainer.tryingScrollTop(scrollContainer) && isNotReachedUp) {
        let scrollPressure = scrollContainer.top - sortableContainer.cloneNodePosition.top;
        this._addToScrollAnimation(sortableContainer, scrollContainer, 'top', scrollPressure, scrollAnimationQueue);

      } else if (sortableContainer.tryingScrollBottom(scrollContainer) && isNotReachedDown) {
        let scrollPressure = sortableContainer.cloneNodePosition.bottom - scrollContainer.bottom;
        this._addToScrollAnimation(sortableContainer, scrollContainer, 'bottom', scrollPressure, scrollAnimationQueue);
      }
    }

    if (scrollContainer.maxScrollWidth) {

      if (sortableContainer.tryingScrollLeft(scrollContainer) && isNotReachedLeft) {
        let scrollPressure = scrollContainer.left - sortableContainer.cloneNodePosition.left;
        this._addToScrollAnimation(sortableContainer, scrollContainer, 'left', scrollPressure, scrollAnimationQueue);

      } else if (sortableContainer.tryingScrollRight(scrollContainer) && isNotReachedRight) {
        let scrollPressure = sortableContainer.cloneNodePosition.right - scrollContainer.right;
        this._addToScrollAnimation(sortableContainer, scrollContainer, 'right', scrollPressure, scrollAnimationQueue);
      }
    }
  },

  _addToScrollAnimation (sortableContainer, scrollContainer, scrollDirection, scrollPressure, scrollAnimationQueue) {
    let scrollSpeed = get(this, 'scrollSpeed');

    if (sortableContainer.isDragging) {
      scrollContainer.triggerScroll(sortableContainer, scrollDirection, scrollSpeed, scrollPressure);

      this[scrollAnimationQueue] = requestAnimationFrame(() => {
        this._handleScroll(sortableContainer, scrollContainer, scrollAnimationQueue);
      });
    }
  },

  _onDrop() {
    document.querySelector('body').removeChild(get(this, 'sortableContainer').cloneNode);

    get(this, 'element').removeAttribute('style');

    get(this, 'sortableContainer').stopDrag();

    set(this, 'sortableContainer', null);

    get(this, 'currentSortPane').send('updateList', get(this, 'element'));
  },

  _onDragover(ev) {
    if (get(this, 'sortManager.isDragging')) {

      let sortableElement = get(this, 'element');
      let pageY = ev.detail.pageY;
      let { top } = sortableElement.getBoundingClientRect();
      let height = sortableElement.offsetHeight;
      let isDraggingUp = (pageY - top) < (height / 2);
      let position = get(this, 'position');

      this.sendAction('dragover', sortableElement, isDraggingUp, position, ev);
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
