import Route from '@ember/routing/route';
import { A } from '@ember/array';

export default Route.extend({
  model() {
    return {
      squadA: A(['Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram']),
      squadB: A(['Prathees', 'Venkatesh', 'Albert', 'Ramya']),
      squadC: A(['Raghul', 'Anto', 'Akshaya', 'Shakti'])
    }
  }
});
