import Component from '@ember/component';
import layout from './template';
import { inject } from '@ember/service';
import { isEqual, isEmpty } from '@ember/utils';
import { get, set, setProperties, computed } from '@ember/object';
import { reads, not } from '@ember/object/computed';
// import { A } from '@ember/array';
import { bind } from '@ember/runloop';
import { assert } from '@ember/debug';
import { htmlSafe } from '@ember/template';
import { Promise } from 'rsvp';

// let convertToArray = (collection) => {
//   if (collection.toArray) {
//     return collection.toArray();
//   }

//   return A(collection);
// };

export default Component.extend({
  layout,
  classNames: ['sort-pane'],
  attributeBindings: ['sortPane:sort-pane'],
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
  },

  didInsertElement() {
    this._super(...arguments);

    let element = get(this, 'element');

    // Registering Events
    element.addEventListener('dragEnter', this._onDragenter);
    element.addEventListener('dragLeave', this._onDragleave);
  },

  willDestroyElement() {
    this._super(...arguments);

    let element = get(this, 'element');

    // Teardown Events
    element.removeEventListener('dragEnter', this._onDragenter);
    element.removeEventListener('dragLeave', this._onDragleave);
  },

  _onDragenter() {
    if (get(this, 'isNotConnected') || get(this, 'isActiveSortPane')) {
      return;
    }

    let sortManager = get(this, 'sortManager');
    let targetList = get(this, 'collection');
    let sourceList = get(sortManager, 'sourceList');
    let activeSortPane = this;
    let isSamePane = isEqual(sourceList, targetList);
    let targetIndex = get(targetList, 'length');
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
    this.sendAction('onDragleave');
  },

  _resetSortManager() {
    let sortManager = get(this, 'sortManager');

    setProperties(sortManager, {
      isDragging: false,
      targetIndex: null,
      draggedItem: null,
      currentOverIndex: null,
      sortPane: null
    });
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
        'sourceList': collection,
        'targetList': collection,
        'isDragging': true,
        'sourceGroup': get(this, 'group'),
        'draggedItem': item,
        'targetIndex': sourceIndex,
        sourceIndex,
        activeSortPane
      });

      this.sendAction('onDragStart', item, collection, sourceIndex);
    },
    onDrag() {
      this.sendAction('onDrag', ...arguments);
    },
    onDragEnd() {
      this.sendAction('onDragEnd', ...arguments);
    },
    updateDragState($element, overOnTopHalf, currentOverIndex) {
      // Need to bring in the sort-item calculation logic here
      let sortManager = get(this, 'sortManager');
      let sourceIndex = get(this, 'sourceIndex');
      let sourceList = get(this, 'sourceList');
      let targetList = get(this, 'targetList');
      let sortAdjuster = (isEqual(sourceList, targetList) && currentOverIndex > sourceIndex) ? 1 : 0;
      let targetIndex = (overOnTopHalf ? currentOverIndex : (currentOverIndex + 1)) - sortAdjuster;

      setProperties(sortManager, {
        overOnTopHalf,
        currentOverIndex,
        targetIndex,
        sourceIndex
      });

      this.sendAction('onDragover');
    },
    updateList(draggedElement) {
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
          if (updateList === false) {
            this.resetChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex);
          }
        }).catch((err) => {
          // eslint-disable-next-line no-console
          // console.error(err);
          this.resetChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex);
        });
      }

      this._resetSortManager();
    }
  }
});
