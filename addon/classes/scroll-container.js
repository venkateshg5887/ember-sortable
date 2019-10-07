import Container from './container';

const MAXSCROLLPRESSURE = 100;

export default class ScrollContainer extends Container {
  constructor(element, options) {
    super(element);

    this.scrollHeight = this.element.scrollHeight;
    this.scrollWidth = this.element.scrollWidth;
    this.maxScrollHeight = this.scrollHeight - (this.offsetHeight - this.verticalBorderWidth);
    this.maxScrollWidth = this.scrollWidth - (this.offsetWidth - this.horizontalBorderWidth);

    Object.assign(this, options);
  }

  get scrollTop() {
    return this.element.scrollTop;
  }

  set scrollTop(value) {
    this.element.scrollTop = value;
  }

  get scrollLeft() {
    return this.element.scrollLeft;
  }

  set scrollLeft(value) {
    this.element.scrollLeft = value;
  }

  handleScroll(sortableContainer, scrollSpeed = 5) {
    if (this.maxScrollHeight) {

      if (this.tryingScrollTop(sortableContainer)) {
        let scrollPressure = this.top - sortableContainer.cloneNodePosition.top;
        this.addToScrollQueue(sortableContainer, 'top', scrollSpeed, scrollPressure);

      } else if (this.tryingScrollBottom(sortableContainer)) {
        let scrollPressure = sortableContainer.cloneNodePosition.bottom - this.bottom;
        this.addToScrollQueue(sortableContainer, 'bottom', scrollSpeed, scrollPressure);
      }
    }

    if (this.maxScrollWidth) {

      if (this.tryingScrollLeft(sortableContainer)) {
        let scrollPressure = this.left - sortableContainer.cloneNodePosition.left;
        this.addToScrollQueue(sortableContainer, 'left', scrollSpeed, scrollPressure);

      } else if (this.tryingScrollRight(sortableContainer)) {
        let scrollPressure = sortableContainer.cloneNodePosition.right - this.right;
        this.addToScrollQueue(sortableContainer, 'right', scrollSpeed, scrollPressure);
      }
    }
  }

  addToScrollQueue(sortableContainer, scrollDirection, scrollSpeed, scrollPressure) {
    // this._scrollQueue = window.requestAnimationFrame(() => {
      this.triggerScroll(sortableContainer, scrollDirection, this._getScrollValue(scrollSpeed, scrollPressure));
    // });
  }

  triggerScroll(sortableContainer, direction, scrollSpeed, scrollPressure) {
    let scrollValue = this._getScrollValue(scrollSpeed, scrollPressure);
    let scrollContainer = this;
    let scrollTo = {
      top() {
        scrollContainer.element.scrollTop -= scrollValue;
      },
      bottom() {
        scrollContainer.element.scrollTop += scrollValue;
      },
      left() {
        scrollContainer.element.scrollLeft -= scrollValue;
      },
      right() {
        scrollContainer.element.scrollLeft += scrollValue;
      }
    }

    scrollTo[direction]();

    // this._scrollQueue = window.requestAnimationFrame(() => {
    //   if (sortableContainer.isDragging) {
    //     this.handleScroll(sortableContainer);
    //   }
    // });
  }

  cancelScrollQueue() {
    window.cancelAnimationFrame(this._scrollQueue);
  }

  _getScrollValue(scrollSpeed, scrollPressure) {
    return Math.floor(scrollSpeed + (Math.min(scrollPressure, MAXSCROLLPRESSURE) / 10) / 2)
  }
}
