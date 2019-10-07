import Container from './container';

const {
  assert
} = console;

export default class SortableContainer extends Container {
  constructor(element) {
    super(element);
    assert(window.event, `This Class ${this.constructor.name} should be Instantiate only on MouseEvent`);

    this.event = window.event;
    this.cloneNode = this.element.cloneNode(true);
    this.shiftX = this.event.clientX - (this.left - this.marginLeft);
    this.shiftY = this.event.clientY - (this.top - this.marginTop);
    this.grabbedAt = {
      x: this.left - this.marginLeft,
      y: this.top - this.marginTop
    };
    this.isDragging = false;
  }

  get cloneNodePosition() {
    let top = this.event.clientY - this.shiftY;
    let left = this.event.clientX - this.shiftX;
    let bottom = top + this.offsetHeight;
    let right = left + this.offsetWidth;

    return {
      top,
      left,
      bottom,
      right
    };
  }

  tryingScrollTop(scrollableContainer) {
    return (this.cloneNodePosition.top + this.marginTop) <= scrollableContainer.top;
  }

  tryingScrollBottom(scrollableContainer) {
    return (this.cloneNodePosition.bottom + this.marginBottom) >= scrollableContainer.bottom;
  }

  tryingScrollLeft(scrollableContainer) {
    return (this.cloneNodePosition.left + this.marginLeft) <= scrollableContainer.left;
  }

  tryingScrollRight(scrollableContainer) {
    return (this.cloneNodePosition.right + this.marginRight) >= scrollableContainer.right;
  }

  startDrag() {
    this.isDragging = true;
  }

  stopDrag() {
    this.isDragging = false;
  }

  updatePosition({ containmentContainer } = {}) {
    let dragX, dragY;

    this.event = window.event;

    if (containmentContainer && containmentContainer.containment) {
      if (this.tryingScrollLeft(containmentContainer)) {
        dragX = containmentContainer.left - this.marginLeft;
      } else if (this.tryingScrollRight(containmentContainer)) {
        dragX = containmentContainer.right - (this.offsetWidth + this.marginRight);
      }

      if (this.tryingScrollTop(containmentContainer)) {
        dragY = containmentContainer.top - this.marginTop;
      } else if (this.tryingScrollBottom(containmentContainer)) {
        dragY = containmentContainer.bottom - (this.offsetHeight + this.marginTop);
      }
    }

    this.cloneNode.style.left = `${dragX || this.cloneNodePosition.left}px`;
    this.cloneNode.style.top = `${dragY || this.cloneNodePosition.top}px`;
  }
}
