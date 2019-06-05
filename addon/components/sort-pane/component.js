import Component from '@ember/component';
import layout from './template';
import { inject } from '@ember/service';
import { isEqual, isEmpty } from '@ember/utils';
import { get, setProperties, computed } from '@ember/object';
import { reads, not } from '@ember/object/computed';
import { A } from '@ember/array';
import { bind } from '@ember/runloop';
import { assert } from '@ember/debug';

let convertToArray = (collection) => {
  if (collection.toArray) {
    return collection.toArray();
  }

  return A(collection);
};

export default Component.extend({
  layout,
  classNames: ['sortable-pane'],
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
  scrollContainer: '.sortable-pane',
  scrollSpeed: 10,

  isConnected: computed('sortManager.sourceGroup', 'group', function() {
    let currentGroup = get(this, 'group');
    let sourceGroup = get(this, 'sortManager.sourceGroup');

    return isEqual(currentGroup, sourceGroup);
  }),
  isActiveSortPane: computed('sortManager.activeSortPane', function() {
    return isEqual(this, get(this, 'sortManager.activeSortPane'));
  }),
  collection: computed('items.[]', function() {
    return convertToArray(get(this, 'items'));
  }),

  init() {
    this._super(...arguments);

    assert('tagName should not be empty', isEmpty(get(this, 'tagName')));

    this._onDragenter = bind(this, this._onDragenter);
  },

  didInsertElement() {
    this._super(...arguments);

    // Registering Events
    this.$().bind('dragEnter.sortpane', this._onDragenter);
  },

  willDestroyElement() {
    this._super(...arguments);

    // Teardown Events
    this.$().unbind('dragEnter.sortpane');
  },

  _onDragenter() {
    if (get(this, 'isNotConnected') || isEqual(this, get(this, 'activeSortPane'))) {
      return;
    }

    let sortManager = get(this, 'sortManager');
    let targetList = get(this, 'collection');
    let activeSortPane = this;

    setProperties(sortManager, {
      activeSortPane,
      targetList
    });
  },

  _resetSortManager() {
    let sortManager = get(this, 'sortManager');

    setProperties(sortManager, {
      isDragging: false,
      targetIndex: null,
      draggedItem: null,
      currentOverIndex: null
    });
  },

  applyChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex) {
    sourceList.removeAt(sourceIndex);
    targetList.insertAt(targetIndex, draggedItem);
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

      this.sendAction('onDragStart');
    },
    updateDragState($element, overOnTopHalf, currentOverIndex) {
      // Need to bring in the sort-item calculation logic here
      let sortManager = get(this, 'sortManager');
      let sourceIndex = get(this, 'sourceIndex');
      let sortAdjuster = currentOverIndex > sourceIndex ? 1 : 0;
      let targetIndex = (overOnTopHalf ? currentOverIndex : (currentOverIndex + 1)) - sortAdjuster;

      setProperties(sortManager, {
        overOnTopHalf,
        currentOverIndex,
        targetIndex,
        sourceIndex
      });
    },
    updateList(ev) {
      let targetList = get(this, 'targetList');
      let targetIndex = get(this, 'targetIndex');
      let sourceList = get(this, 'sourceList');
      let sourceIndex = get(this, 'sourceIndex');
      let draggedItem = get(this, 'draggedItem');

      if (!(isEqual(sourceList, targetList) && isEqual(sourceIndex, targetIndex))) {
        this.applyChanges(draggedItem, sourceList, sourceIndex, targetList, targetIndex);

        this.sendAction('onDragEnd', draggedItem, sourceList, sourceIndex, targetList, targetIndex, this.applyChanges, ev);
      }

      this._resetSortManager();
    }
  }
});
