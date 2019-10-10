import Container from './container';

const MAX_SCROLL_PRESSURE = 100;
const DEFAULT_SCROLL_SPEED = 3;

export default class ScrollContainer extends Container {
  constructor(element, options) {
    super(element);

    this.scrollAnimationID = '_dndPaneScroll';
    this.maxScrollHeight = this.scrollHeight - (this.offsetHeight - this.verticalBorderWidth);
    this.maxScrollWidth = this.scrollWidth - (this.offsetWidth - this.horizontalBorderWidth);
    this.scrollSpeed = DEFAULT_SCROLL_SPEED;

    Object.assign(this, options);
  }

  get scrollHeight() {
    return this.element.scrollHeight;
  }

  get scrollWidth() {
    return this.element.scrollWidth;
  }

  get scrollTop() {
    return this.element.scrollTop;
  }

  get scrollLeft() {
    return this.element.scrollLeft;
  }

  handleScroll(sortableContainer, scrollContainer) {
    this._flushScrollQueue();
    this._scrollEngine(sortableContainer, scrollContainer);
  }

  _scrollEngine(sortableContainer) {
    let vScrollProgress = this.clientHeight + this.scrollTop;
    let hScrollProgress = this.clientWidth + this.scrollLeft;
    let isNotReachedUp = this.scrollTop > 0;
    let isNotReachedDown = vScrollProgress < this.scrollHeight;
    let isNotReachedLeft = this.scrollLeft > 0;
    let isNotReachedRight = hScrollProgress < this.scrollWidth;

    if (this.maxScrollHeight) {

      if (sortableContainer.tryingScrollTop(this) && isNotReachedUp) {
        let scrollPressure = this.top - sortableContainer.cloneNodePosition.top;
        this._addToScrollQueue(sortableContainer, 'top', scrollPressure);

      } else if (sortableContainer.tryingScrollBottom(this) && isNotReachedDown) {
        let scrollPressure = sortableContainer.cloneNodePosition.bottom - this.bottom;
        this._addToScrollQueue(sortableContainer, 'bottom', scrollPressure);
      }
    }

    if (this.maxScrollWidth) {

      if (sortableContainer.tryingScrollLeft(this) && isNotReachedLeft) {
        let scrollPressure = this.left - sortableContainer.cloneNodePosition.left;
        this._addToScrollQueue(sortableContainer, 'left', scrollPressure);

      } else if (sortableContainer.tryingScrollRight(this) && isNotReachedRight) {
        let scrollPressure = sortableContainer.cloneNodePosition.right - this.right;
        this._addToScrollQueue(sortableContainer, 'right', scrollPressure);
      }
    }
  }

  _addToScrollQueue (sortableContainer, scrollDirection, scrollPressure) {
    if (sortableContainer.isDragging) {
      this.triggerScroll(sortableContainer, scrollDirection, scrollPressure);

      window[this.scrollAnimationID] = requestAnimationFrame(() => {
        this._scrollEngine(sortableContainer);
      });
    }
  }

  triggerScroll(sortableContainer, direction, scrollPressure) {
    let scrollValue = this._getScrollValue(scrollPressure);
    let scrollTo = {
      top() {
        this.element.scrollTop -= scrollValue;
      },
      bottom() {
        this.element.scrollTop += scrollValue;
      },
      left() {
        this.element.scrollLeft -= scrollValue;
      },
      right() {
        this.element.scrollLeft += scrollValue;
      }
    }

    scrollTo[direction]['apply'](this);
  }

  _flushScrollQueue() {
    window.cancelAnimationFrame(window[this.scrollAnimationID]);
  }

  _getScrollValue(scrollPressure) {
    return Math.floor(this.scrollSpeed + (Math.min(scrollPressure, MAX_SCROLL_PRESSURE) / 10) / 2)
  }
}
