const CSSPROPERTIES = ['margin', 'border'];
const CONTAINERSIDES = ['Left', 'Right', 'Top', 'Bottom'];

const {
  assert
} = console;

export default class Container {
  constructor(element) {
    assert(element, `element must be passed to the Class ${this.constructor.name}`);

    this.element = element;
    let { left, right, top, bottom } = this.element.getBoundingClientRect();
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.computedDOMStyles = this.element.currentStyle || window.getComputedStyle(this.element);
    this.width = this._parseValueFromStyle(this.computedDOMStyles.width);
    this.height = this._parseValueFromStyle(this.computedDOMStyles.height);
    this.offsetWidth = this.element.offsetWidth;
    this.offsetHeight = this.element.offsetHeight;
    this.clientWidth = this.element.clientWidth;
    this.clientHeight = this.element.clientHeight;

    // DOM measurements
    let measurements = CSSPROPERTIES.reduce((previousValue, item) => {
      let subProp = item === 'border' ? 'Width' : '';

      CONTAINERSIDES.forEach((side) => {
        let propertyName = item + side + subProp;
        previousValue[propertyName] = this._parseValueFromStyle(this.computedDOMStyles[propertyName]);
      });

      return previousValue;
    }, {});

    Object.assign(this, measurements);

    this.verticalBorderWidth = this.borderTopWidth + this.borderBottomWidth;
    this.horizontalBorderWidth = this.borderLeftWidth + this.borderRightWidth;
  }

  $(selector) {
    let element = this.element;
    if (selector) {
      return element.querySelector(selector);
    } else {
      return element;
    }
  }

  _parseValueFromStyle(valueString) {
    return parseInt(valueString);
  }
}
