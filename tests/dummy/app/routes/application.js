import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    return {
      squadA: ['Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram', 'Rajesh', 'Ghanesh', 'Shyam', 'Karthick Kalyanasundaram'],
      squadB: ['Prathees', 'Venkatesh', 'Albert', 'Ramya'],
      squadC: ['Raghul', 'Anto', 'Akshaya', 'Shakti']
    }
  }
});
