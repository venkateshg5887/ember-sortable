import Service from '@ember/service';
import { computed } from '@ember/object';
import { A } from '@ember/array';

export default Service.extend({
  currentDropPosition: null,
  sourceIndex: null,
  targetIndex: null,

  sourceList: computed(function() {
    return A();
  }),
  targetList: computed(function() {
    return A();
  })
});
