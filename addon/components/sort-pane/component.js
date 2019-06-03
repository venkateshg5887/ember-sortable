import Component from '@ember/component';
import layout from './template';
import { inject } from '@ember/service';
import { isEqual } from '@ember/utils';
import { get, set, setProperties, computed } from '@ember/object';
import { reads, not } from '@ember/object/computed';
import { A } from '@ember/array';
import { bind } from '@ember/runloop';

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
  scrollSpeed: 20,

  isConnected: computed('sortManager.sourceGroup', 'group', function() {
    let currentGroup = get(this, 'group');
    let sourceGroup = get(this, 'sortManager.sourceGroup');

    return isEqual(currentGroup, sourceGroup);
  }),
  isActiveSortPane: computed('sortManager.activeSortPane', function() {
    return isEqual(this, get(this, 'sortManager.activeSortPane'));
  }),
  collection: computed(function() {
    return convertToArray(get(this, 'items'));
  }),

  init() {
    this._super(...arguments);

    this._onMouseenter = bind(this, this._onMouseenter);
  },

  didInsertElement() {
    this._super(...arguments);

    // Registering Events
    this.$().bind('dragEnter.sortpane', this._onMouseenter);
  },

  willDestroyElement() {
    this._super(...arguments);

    this.$().unbind('dragEnter.sortpane');
  },

  _onMouseenter(ev) {
    if (get(this, 'isNotConnected')) {
      return true;
    }

    let sortManager = get(this, 'sortManager');
    let targetList = get(this, 'collection');
    let activeSortPane = this;

    setProperties(sortManager, {
      activeSortPane,
      'targetList.content': targetList
    });
  },
  dragLeave(ev) {
    if (get(this, 'isNotConnected')) {
      return true;
    }
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

  actions: {
    onDragStart(item, sourceIndex) {
      let sortManager = get(this, 'sortManager');
      let collection = get(this, 'collection');
      let activeSortPane = this;

      setProperties(sortManager, {
        'sourceList.content': collection,
        'targetList.content': collection,
        'isDragging': true,
        'sourceGroup': get(this, 'group'),
        'draggedItem': item,
        'targetIndex': sourceIndex,
        sourceIndex,
        activeSortPane
      });

      this.sendAction('onDragStart');
    },
    updateDragState($element, overOnTopHalf, currentOverIndex, ev) {
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
    updateList(targetIndex, ev) {
      let targetList = get(this, 'targetList');
      let sourceList = get(this, 'sourceList');
      let sourceIndex = get(this, 'sourceIndex');
      let draggedItem = get(this, 'draggedItem');

      sourceList.removeAt(sourceIndex);
      targetList.insertAt(targetIndex, draggedItem);

      this._resetSortManager();

      this.sendAction('onDragEnd', ev, draggedItem, sourceList, targetList, targetIndex);
    }
  }
});
