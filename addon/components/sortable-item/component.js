import Component from '@ember/component';
import layout from './template';
import { bind } from '@ember/runloop';
import { get, set, setProperties } from '@ember/object';
import $ from 'jquery';
import { inject } from '@ember/service';
import { assign } from '@ember/polyfills';
import { isEqual, isEmpty } from '@ember/utils';
import { reads } from '@ember/object/computed';
import { assert } from '@ember/debug';

const CONTAINERSIDES = ['Left', 'Right', 'Top', 'Bottom'];
const DRAGACTIONS = ['mousemove', 'touchmove'];
const DROPACTIONS = ['mouseup', 'touchend'];
// const CONTEXTMENUKEYCODE = 3;

export default Component.extend({
  layout,
  attributeBindings: ['position'],
  classNames: ['draggable'],
  isDisabled: false,
  sortManager: inject(),
  currentSortPane: reads('sortManager.activeSortPane'),
  scrollPane: reads('sortManager.activeSortPane'),
  sourceIndex: reads('sortManager.sourceIndex'),
  targetIndex: reads('sortManager.targetIndex'),
  cloneNode: null,
  isDragEntered: false,

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

    element.style['touch-action'] = 'none';

    element.addEventListener('mousedown', this._onMouseDown);

    this.$().bind('mousemove.sortabble', this._onDragover);
  },

  willDestroyElement() {
    this._super(...arguments);

    get(this, 'element').removeEventListener('mousedown', this._onMouseDown);
    // This should replace with javascript event dispatch
    this.$().unbind('mousemove.sortabble');

    this._detachDragEventManager();
  },

  _preventDefaultBehavior(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  },

  _onMouseDown() {
    // if (isEqual(ev.which, CONTEXTMENUKEYCODE)) {
    //   return;
    // }
    // let handle = get(this, 'handle');

    // if (handle && !ev.target.closest(handle)) {
    //   return;
    // }

    // this._preventDefaultBehavior(ev);

    DRAGACTIONS.forEach(event => window.addEventListener(event, this._dragEventsManager));
    DROPACTIONS.forEach(event => window.addEventListener(event, this._detachDragEventManager));
  },

  _dragEventsManager(ev) {
    // this._preventDefaultBehavior(ev);
    this._detachDragEventManager();

    this._cloneDraggable(ev);

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

  _cloneDraggable(ev) {
    let sortableElement = get(this, 'element');
    let cloneNode = sortableElement.cloneNode(true);
    let sortableElementStyle = sortableElement.currentStyle || window.getComputedStyle(sortableElement);
    let properties = ['margin', 'padding', 'border'];
    let sortableElementClientRect = sortableElement.getBoundingClientRect();

    let sortableElementContainer = properties.reduce((previousValue, item) => {
      let subProp = isEqual(item, 'border') ? 'Width' : '';

      CONTAINERSIDES.forEach((side) => {
        let propertyName = item + side + subProp;
        previousValue[propertyName] = parseFloat(sortableElementStyle[propertyName]);
      });

      return previousValue;
    }, {});

    let shiftX = (ev.clientX + sortableElementContainer.marginLeft) - sortableElementClientRect.left;
    let shiftY = (ev.clientY + sortableElementContainer.marginTop) - sortableElementClientRect.top;
    let grabbedAt = {
      x: ev.clientX - shiftX,
      y: ev.clientY - shiftY,
    };
    let paddingHorizontal = sortableElementContainer.paddingLeft + sortableElementContainer.paddingRight;
    let paddingVertical = sortableElementContainer.paddingTop + sortableElementContainer.paddingBottom;
    let borderHorizontal = sortableElementContainer.borderLeftWidth + sortableElementContainer.borderRightWidth;
    let borderVertical = sortableElementContainer.borderTopWidth + sortableElementContainer.borderBottomWidth;
    let exactWidth = sortableElement.offsetWidth - (paddingHorizontal + borderHorizontal);
    let exactHeight = sortableElement.offsetHeight - (paddingVertical + borderVertical);

    sortableElementContainer = assign(
      {},
      sortableElementClientRect.toJSON(),
      {shiftX},
      {shiftY},
      sortableElementContainer,
      {paddingHorizontal},
      {borderHorizontal},
      {exactWidth},
      {exactHeight},
      {grabbedAt}
    );

    cloneNode.id = `${cloneNode.id}--clone`;
    cloneNode.style.position = 'absolute';
    cloneNode.style.width = `${sortableElementContainer.exactWidth}px`;
    cloneNode.style.height = `${sortableElementContainer.exactHeight}px`;
    cloneNode.style.left = `${sortableElementContainer.grabbedAt.x}px`;
    cloneNode.style.top = `${sortableElementContainer.grabbedAt.y}px`;
    cloneNode.style.zIndex = '9999';

    let documentBody = document.getElementsByTagName('body')[0];

    documentBody.appendChild(cloneNode);

    setProperties(this, {
      cloneNode,
      sortableElementContainer
    });

  },

  _onDrag(ev) {
    this._preventDefaultBehavior(ev);

    let sortableElement = get(this, 'element');
    let cloneNode = get(this, 'cloneNode');
    let sortableElementContainer = get(this, 'sortableElementContainer');
    let draggedElement = $(cloneNode);
    let sortManager = get(this, 'sortManager');
    let currentSortPane = get(sortManager, 'sortPaneElement');

    sortableElement.style.display = 'none';
    cloneNode.style.left = `${ev.clientX - sortableElementContainer.shiftX}px`;
    cloneNode.style.top = `${ev.clientY - sortableElementContainer.shiftY}px`;

    cloneNode.hidden = true;
    let elementFromPoint = document.elementFromPoint(ev.clientX, ev.clientY);
    let sortabble = $(elementFromPoint).closest('.draggable'); // Check for not pane element (collide happens when nested sortable initialized)
    let sortPane = $(elementFromPoint).closest('.sortable-pane');
    let scrollPane = $(elementFromPoint).closest(get(this, 'scrollContainer'));
    cloneNode.hidden = false;

    // let newMouseEvent = new MouseEvent("mousemove", {
    //   bubbles: true,
    //   cancelable: true,
    //   view: window
    // });

    // This should not be css class dependent
    // should be an attribute and readOnly
    if (sortabble.length) {
      let newMouseEvent = $.Event('mousemove.sortabble', ev);
      sortabble.trigger(newMouseEvent);
    }

    // This should not be css class dependent
    // should be an attribute and it should be readOnly
    if (sortPane.length) {

      if (isEqual(currentSortPane, sortPane.get(0)) && !get(this, 'isDragEntered')) {

        sortPane.trigger('dragEnter.sortpane');
        set(this, 'isDragEntered', true);

      } else if (!isEqual(currentSortPane, sortPane.get(0)) && get(this, 'isDragEntered')) {

        $(currentSortPane).trigger('dragLeave.sortpane');
        set(this, 'isDragEntered', false);

      }

      set(sortManager, 'sortPaneElement', sortPane.get(0));

    }

    scrollPane = scrollPane.length ? scrollPane : sortPane;

    if (draggedElement.length && scrollPane.length && this._hasScroll(scrollPane.get(0))) {
      this._handleScroll(scrollPane, draggedElement);
    }
  },

  _onDrop() {
    let sortableElement = get(this, 'element');
    let documentBody = document.getElementsByTagName('body')[0];

    documentBody.removeChild(get(this, 'cloneNode'));
    sortableElement.removeAttribute('style');

    set(this, 'cloneNode', null);

    get(this, 'currentSortPane').send('updateList', get(this, 'targetIndex'));
  },

  _onDragover(ev) {
    if (get(this, 'sortManager.isDragging')) {

      let sortableElement = this.$();
      let pageY = ev.originalEvent ? ev.originalEvent.pageY : ev.pageY;
      let top = sortableElement.offset().top;
      let height = sortableElement.outerHeight();
      let isDraggingUp = (pageY - top) < (height / 2);
      let position = get(this, 'position');

      this.sendAction('dragover', sortableElement, isDraggingUp, position, ev);
    }
  },

  _hasScroll(scrollPane) {
    return scrollPane.scrollHeight > scrollPane.clientHeight;
  },

  _handleScroll(scrollPane, draggedElement) {
    // convert to vanilla javascript
    let draggedElementBottom = draggedElement.offset().top + draggedElement.outerHeight(true);
    let scrollPaneBottom = scrollPane.offset().top + scrollPane.outerHeight(true);
    let draggedElementTop = draggedElement.offset().top;
    let scrollPaneTop = scrollPane.offset().top;
    let paneScrolledTill = scrollPane.get(0).clientHeight + scrollPane.get(0).scrollTop;
    let paneScrollHeight = scrollPane.prop('scrollHeight');
    let isDraggingUp = draggedElementTop <= scrollPaneTop;
    let isNotReachedUp = scrollPane.scrollTop() > 0;
    let isDraggingDown = draggedElementBottom >= scrollPaneBottom
    let isNotReachedDown = paneScrolledTill <= paneScrollHeight;
    let isTryingToScroll = isDraggingUp || isDraggingDown;

    if (isTryingToScroll) {
      if (isDraggingUp && isNotReachedUp) {
        this._scrollPane(scrollPane.get(0), true);
      }

      if (isDraggingDown && isNotReachedDown) {
        this._scrollPane(scrollPane.get(0));
      }
    }
  },

  _scrollPane(sortPane, isDraggingUp = false) {
    if (isDraggingUp) {
      sortPane.scrollTop -= get(this, 'scrollSpeed');
    } else {
      sortPane.scrollTop += get(this, 'scrollSpeed');
    }
  }
});
