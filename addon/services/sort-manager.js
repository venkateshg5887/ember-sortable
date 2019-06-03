import Service from '@ember/service';
import { computed } from '@ember/object';
import ArrayProxy from '@ember/array/proxy';
import { A } from '@ember/array';

export default Service.extend({
  currentDropPosition: null,

  sourceList: computed(function() {
    return ArrayProxy.create({
      content: A([])
    });
  }),
  targetList: computed(function() {
    return ArrayProxy.create({
      content: A([])
    });
  })
});
