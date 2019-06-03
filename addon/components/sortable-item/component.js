import Component from '@ember/component';
import layout from './template';
import { bind } from '@ember/runloop';
import { get, set, setProperties } from '@ember/object';
import { capitalize } from '@ember/string';
import $ from 'jquery';
import { inject } from '@ember/service';
import { assign } from '@ember/polyfills';
import { isEqual } from '@ember/utils';
import { reads } from '@ember/object/computed';

const CONTAINERSIDES = ['Left', 'Right', 'Top', 'Bottom'];

export default Component.extend({
  layout,
  attributeBindings: ['position'],
  classNames: ['draggable'],
  isDisabled: false,
  sortManager: inject(),
  currentSortPane: reads('sortManager.activeSortPane'),
  scrollPane: reads('sortManager.activeSortPane'),

  init() {
    this._super(...arguments);

    this._startDrag = this._startDrag.bind(this);
    this._onMouseup = this._onMouseup.bind(this);
    this._onMousemove = this._onMousemove.bind(this);
    this._simulateDrag = bind(this, this._simulateDrag);
    this._preventDefaultBehavior = this._preventDefaultBehavior.bind(this);
  },

  didInsertElement() {
    this._super(...arguments);

    // Registering Events
    this.get('element').addEventListener('mousedown', this._startDrag);
    // this.get('element').addEventListener('mousemove', this._simulateDrag);
    this.$().bind('mousemove.sortabble', this._simulateDrag);
    // this.get('element').addEventListener('mouseover', this._onMouseover);
    // This should be a conditional option to prevent click {default: true}
    // this.get('element').addEventListener('click', this._preventDefaultBehavior);
  },

  willDestroyElement() {
    this._super(...arguments);

    this.get('element').removeEventListener('mousedown', this._startDrag);
    // This should replace with javascript event dispatch
    this.$().unbind('mousemove.sortabble');
  },

  _simulateDrag(ev) {
    // console.log('mouseOver --> ', ev);
    if (get(this, 'sortManager.isDragging')) {
      this._forceDragover(ev);
    }
  },

  _preventDefaultBehavior(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  },

  _startDrag(ev) {
    if (get(this, 'disabled')) {
      return;
    }

    this._preventDefaultBehavior(ev);

    set(this, 'isDragging', true);

    let sortableElement = this.get('element');
    let cloneNode = sortableElement.cloneNode(true);
    let sortableElementStyle = sortableElement.currentStyle || window.getComputedStyle(sortableElement);
    let properties = ['margin', 'padding', 'border'];
    let sortableElementClientRect = sortableElement.getBoundingClientRect();

    let sortableElementContainer = properties.reduce((previousValue, item) => {
      let appendProp = isEqual(item, 'border') ? 'Width' : '';

      CONTAINERSIDES.forEach((side) => {
        let propertyName = item + side;
        previousValue[propertyName + appendProp] = parseFloat(sortableElementStyle[propertyName]);
      });

      return previousValue;
    }, {});

    let shiftX = (event.clientX + sortableElementContainer.marginLeft) - sortableElementClientRect.left;
    let shiftY = (event.clientY + sortableElementContainer.marginTop) - sortableElementClientRect.top;
    let grabbedAt = {
      x: event.clientX - shiftX,
      y: event.clientY - shiftY,
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
    // TODO:: scroll while dragging
    let documentBody = document.getElementsByTagName('body')[0];

    documentBody.appendChild(cloneNode);

    setProperties(this, {
      cloneNode,
      sortableElementContainer
    });

    document.addEventListener('mousemove', this._onMousemove);
    document.addEventListener('mouseup', this._onMouseup);

    this.sendAction('dragstart', ev);
    // console.log('mousedown --- >', ev);
  },

  _onMousemove(ev) {
    // this._preventDefaultBehavior(ev);

    if (get(this, 'isDragging')) {
      let sortableElement = this.get('element');
      let cloneNode = get(this, 'cloneNode');
      let sortableElementContainer = get(this, 'sortableElementContainer');
      let draggedElement = $(cloneNode);

      sortableElement.style.display = 'none';

      // console.log('clientX ---> ', ev.clientX, '   &&&&   clientY ---> ', ev.clientY);

      cloneNode.style.left = `${ev.clientX - sortableElementContainer.shiftX}px`;
      cloneNode.style.top = `${ev.clientY - sortableElementContainer.shiftY}px`;

      cloneNode.style.display = 'none';
      let sortabble = $(document.elementFromPoint(ev.clientX, ev.clientY)).closest('.draggable'); // Check for not pane element (collide happens when nested sortable initialized)
      let sortPane = $(document.elementFromPoint(ev.clientX, ev.clientY)).closest('.sortable-pane');
      let scrollPane = $(document.elementFromPoint(ev.clientX, ev.clientY)).closest(get(this, 'scrollContainer'));
      cloneNode.style.display = 'block';

      // let newMouseEvent = new MouseEvent("mousemove", {
      //   bubbles: true,
      //   cancelable: true,
      //   view: window
      // });

      // console.log(elementBelow, elementBelow.classList.contains('draggable'));

      // This should not be css class dependent
      // should be an attribute and readOnly
      if (sortabble.length) {
        let newMouseEvent = $.Event('mousemove.sortabble', ev);
        sortabble.trigger(newMouseEvent);
      }

      // This should not be css class dependent
      // should be an attribute and it should be readOnly
      if (sortPane.length) {
        sortPane.trigger('dragEnter.sortpane');
      }

      scrollPane = scrollPane.length ? scrollPane : sortPane;

      if (draggedElement.length && scrollPane.length && this._hasScroll(scrollPane.get(0))) {
        this._handleScroll(scrollPane, draggedElement);
      }

      // this._forceDragover(ev);
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
    let scrollPaneHeight = scrollPane.outerHeight(true);
    let paneScrolledTill = scrollPane.get(0).clientHeight + scrollPane.get(0).scrollTop;
    let paneScrollHeight = scrollPane.prop('scrollHeight');
    let isDraggingUp = draggedElementTop <= scrollPaneTop;
    let isNotReachedUp = scrollPane.scrollTop() > 0;
    let isDraggingDown = draggedElementBottom >= scrollPaneBottom
    let isNotReachedDown = paneScrolledTill <= paneScrollHeight;
    let isTryingToScroll = isDraggingUp || isDraggingDown;
// console.log('draggedElementTop :: ', draggedElementTop, '--- scrollPaneTop :: ', scrollPaneTop);
    if (isTryingToScroll) {
      if (isDraggingUp && isNotReachedUp) {
        console.log('dragging Up --> ', scrollPane.scrollTop());
        this._scrollPane(scrollPane.get(0), true);
      }

      if (isDraggingDown && isNotReachedDown) {
        console.log('dragging Down --> ', scrollPane.scrollTop());
        this._scrollPane(scrollPane.get(0));
      }

      console.log('isScrolling ---> ', `isDraggingUp :: ${isDraggingUp}`, `isDraggingDown :: ${isDraggingDown}`);
    }
  },

  _scrollPane(sortPane, isDraggingUp = false) {
    if (isDraggingUp) {
      sortPane.scrollTop -= get(this, 'scrollSpeed');
    } else {
      sortPane.scrollTop += get(this, 'scrollSpeed');
    }
  },

  _onMouseup(ev) {
    // console.log('mouseup --- >', ev);
    if (get(this, 'isDragging')) {
      this._preventDefaultBehavior(ev);
      let sortableElement = this.get('element');
      let documentBody = document.getElementsByTagName('body')[0];

      set(this, 'isDragging', false);

      documentBody.removeChild(get(this, 'cloneNode'));
      sortableElement.removeAttribute('style');

      document.removeEventListener('mousemove', this._onMousemove);
      document.removeEventListener('mouseup', this._onMouseup);

      set(this, 'cloneNode', null);

      get(this, 'currentSortPane').send('updateList', get(this, 'sortManager.targetIndex'), ev);
    }
  },

  _forceDragover(ev) {
    let sortableElement = this.$();
    let pageY = ev.originalEvent ? ev.originalEvent.pageY : ev.pageY;
    let top = sortableElement.offset().top;
    let height = sortableElement.outerHeight();
    let isDraggingUp = (pageY - top) < (height / 2);
    let position = get(this, 'position');

    this.sendAction('dragover', sortableElement, isDraggingUp, position, ev);

      // console.log('mouseover -------------------->>>>>>>', ev.target);
  },

  dragStart(ev) {
    this._preventDefaultBehavior(ev);
  }
});
