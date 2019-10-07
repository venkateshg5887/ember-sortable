import Controller from '@ember/controller';
import { defer } from 'rsvp';

export default Controller.extend({
  actions: {
    test() {
      let deferred = defer();

      setTimeout(() => {
        deferred.reject(true);
      }, 3000);

      return deferred.promise;
    }
  }
});
