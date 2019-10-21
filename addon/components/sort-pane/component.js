import Component from '@ember/component';
import layout from './template';
import { inject } from '@ember/service';
import { isEqual, isEmpty } from '@ember/utils';
import { get, getProperties, set, setProperties, computed } from '@ember/object';
import { reads, not } from '@ember/object/computed';
// import { A } from '@ember/array';
import { bind } from '@ember/runloop';
import { assert } from '@ember/debug';
import { htmlSafe } from '@ember/template';
import { Promise } from 'rsvp';
import ScrollContainer from '../../classes/scroll-container';

// let convertToArray = (collection) => {
//   if (collection.toArray) {
//     return collection.toArray();
//   }

//   return A(collection);
// };

export default Component.extend({
  layout,
  classNames: ['sort-pane'],
  classNameBindings: ['isDisabled:disabled'],
  attributeBindings: ['sortPane:sort-pane', 'isDisabled:disabled'],
  sortPane: true,
  sortManager: inject(),
  sourceList: reads('sortManager.sourceList'),
  targetList: reads('sortManager.targetList'),
  sourceIndex: reads('sortManager.sourceIndex'),
  targetIndex: reads('sortManager.targetIndex'),
  draggedItem: reads('sortManager.draggedItem'),
  isDragging: reads('sortManager.isDragging'),
  overOnTopHalf: reads('sortManager.overOnTopHalf'),
  overOnBottomHalf: not('overOnTopHalf'),
  currentOverIndex: reads('sortManager.currentOverIndex'),
  isNotConnected: not('isConnected'),
  scrollSpeed: 3,
  scrollPane: '[sort-pane]',
  containment: null,
  isDisabled: false,

  scrollContainer: computed(function() {
    let scrollPaneElement = get(this, 'element').closest(get(this, 'scrollPane'));
    return new ScrollContainer(scrollPaneElement);
  }),
  placeholderStyles: computed('sortManager.placeholderStyles', function() {
    let styles = get(this, 'sortManager.placeholderStyles');
    let concatStyles = Object.keys(styles).map((prop) => {
      return ` ${prop}: ${styles[prop]}`;
    });

    return htmlSafe(concatStyles.join(';'));
  }),

  isConnected: computed('sortManager.sourceGroup', 'group', function() {
    let currentGroup = get(this, 'group');
    let sourceGroup = get(this, 'sortManager.sourceGroup');

    return isEqual(currentGroup, sourceGroup);
  }),

  isActiveSortPane: computed('sortManager.activeSortPane', function() {
    return isEqual(this, get(this, 'sortManager.activeSortPane'));
  }),

  collection: computed('items.[]', function() {
    // return convertToArray(get(this, 'items'));
    return get(this, 'items');
  }),

  init() {
    this._super(...arguments);

    assert('tagName should not be empty ', isEmpty(get(this, 'tagName')));

    this._onDragenter = bind(this, this._onDragenter);
    this._onDragleave = bind(this, this._onDragleave);
    this._drag = bind(this, this._drag);
  },

  didInsertElement() {
    this._super(...arguments);

    let element = get(this, 'element');

    // Registering Events
    element.addEventListener('dragEnter', this._onDragenter);
    element.addEventListener('dragLeave', this._onDragleave);
    element.addEventListener('drag', this._drag);
  },

  willDestroyElement() {
    this._super(...arguments);

    let element = get(this, 'element');

    // Teardown Events
    element.removeEventListener('dragEnter', this._onDragenter);
    element.removeEventListener('dragLeave', this._onDragleave);
    element.removeEventListener('drag', this._drag);
  },

  _drag(ev) {
    if (!get(this, 'isDisabled')) {
      let sortableContainer = get(this, 'sortManager.sortableContainer');
      let scrollContainer = get(this, 'scrollContainer');

      scrollContainer.handleScroll(sortableContainer);

      this.sendAction('onDrag', ev, sortableContainer);
    }
  },

  _onDragenter() {
    let {
      isNotConnected,
      isActiveSortPane,
      isDisabled
    } = getProperties(this, ['isNotConnected', 'isActiveSortPane', 'isDisabled']);

    if (isNotConnected || isActiveSortPane || isDisabled) {
      return;
    }

    set(this, 'sortManager.isDragEntered', true);

    let sortManager = get(this, 'sortManager');
    let targetList = get(this, 'collection');
    let sourceList = get(sortManager, 'sourceList');
    let activeSortPane = this;
    let isSamePane = isEqual(sourceList, targetList);
    let targetIndex = get(targetList, 'length');
    // Math required to solve out of range index error
    let currentOverIndex = targetIndex - 1;
    // This will show placeholder at the End of the list
    // when we Enter the sort-pane's empty space
    let overOnTopHalf = false;

    if (isSamePane) {
      targetIndex = targetIndex - 1;
      currentOverIndex = currentOverIndex - 1;
    }

    setProperties(sortManager, {
      activeSortPane,
      targetList,
      targetIndex,
      currentOverIndex,
      overOnTopHalf
    });

    this.sendAction('onDragenter');
  },

  _onDragleave() {
    setProperties(this, {
      'sortManager.activeSortPane': null,
      'sortManager.isDragEntered': false
    });

    this.sendAction('onDragleave');
  },

  _resetSortManager() {
    get(this, 'sortManager').reset();
  },

  applyChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex) {
    sourceList.removeAt(sourceIndex);
    targetList.insertAt(targetIndex, draggedItem);
  },

  resetChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex) {
    targetList.removeAt(targetIndex);
    sourceList.insertAt(sourceIndex, draggedItem);
  },

  onDrop() {
    return true;
  },

  actions: {
    onDragStart(item, sourceIndex) {
      let sortManager = get(this, 'sortManager');
      let collection = get(this, 'collection');
      let activeSortPane = this;

      setProperties(sortManager, {
        isDragging: true,
        sourceList: collection,
        targetList: collection,
        sourceIndex,
        targetIndex: sourceIndex,
        sourceGroup: get(this, 'group'),
        draggedItem: item,
        activeSortPane
      });

      this.sendAction('onDragStart', item, collection, sourceIndex);
    },
    onDragEnd() {
      this.sendAction('onDragEnd', ...arguments);
    },
    onDragover() {
      this.sendAction('onDragover', ...arguments);
    },
    onDrop(draggedElement) {
      let targetList = get(this, 'targetList');
      let targetIndex = get(this, 'targetIndex');
      let sourceList = get(this, 'sourceList');
      let sourceIndex = get(this, 'sourceIndex');
      let draggedItem = get(this, 'draggedItem');

      if (!(isEqual(sourceList, targetList) && isEqual(sourceIndex, targetIndex))) {

        this.applyChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex);

        let dropAction = new Promise((resolve) => {
          resolve(get(this, 'onDrop')(draggedItem, sourceList, sourceIndex, targetList, targetIndex, draggedElement));
        });

        set(this, 'dropActionInFlight', true);

        dropAction.then((updateList = true) => {
          if (updateList === false && !(get(this, 'isDestroyed') && get(this, 'isDestroying'))) {
            this.resetChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex);
          }
        }).catch((/*err*/) => {
          // eslint-disable-next-line no-console
          // console.error(err);
          if (!(get(this, 'isDestroyed') && get(this, 'isDestroying'))) {
            this.resetChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex);
          }
        });
      }

      this._resetSortManager();
    }
  }
});
