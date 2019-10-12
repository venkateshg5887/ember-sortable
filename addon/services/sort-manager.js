import Service from '@ember/service';
import { get, computed, setProperties } from '@ember/object';
import { A } from '@ember/array';

export default Service.extend({
  currentDropPosition: null,
  sourceIndex: null,
  targetIndex: null,
  placeholderStyles: null,
  currentOverItem: null,
  isDragging: false,
  draggedItem: null,
  currentOverIndex: null,
  sortPane: null,
  activeSortPane: null,
  sourceGroup: null,
  isDragEntered: null,
  sortableContainer: null,

  activeSortPaneElement: computed('activeSortPane', function() {
    return get(this, 'activeSortPane.element');
  }),

  // TODO :: Collections should be a promise proxy Array
  // While drag and drop mutation will happen implicitly
  // to render the list accordingly and collection should also
  // get update whenever the passed original collection get updated
  sourceList: computed({
    get() {
      return A();
    },
    set(key, val) {
      return val;
    }
  }),
  targetList: computed({
    get() {
      return A();
    },
    set(key, val) {
      return val;
    }
  }),

  reset() {
    setProperties(this, {
      currentDropPosition: null,
      sourceIndex: null,
      targetIndex: null,
      placeholderStyles: null,
      currentOverItem: null,
      isDragging: false,
      draggedItem: null,
      currentOverIndex: null,
      sortPane: null,
      sourceList: A(),
      targetList: A(),
      sourceGroup: null,
      activeSortPane: null,
      sortPaneElement: null,
      sortableContainer: null
    });
  }
});
