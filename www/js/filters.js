angular.module('dHb.filters', [])

.filter('eventDateFormatter', function($filter) {

  return function(eventDate) {
    // Convert string to Date object.
    var eventDate = new Date(eventDate);
    var currentDate = new Date();

    if (eventDate.getDate() == currentDate.getDate()
        && eventDate.getMonth() == currentDate.getMonth()
        && eventDate.getFullYear() == currentDate.getFullYear()) {

      return $filter('date')(eventDate, 'HH:mm');

    } else if (eventDate.getFullYear() == currentDate.getFullYear()) {

      return $filter('date')(eventDate, 'd MMM HH:mm');

    } else {
      return $filter('date')(eventDate, 'd MMM, yyyy HH:mm');
    }
  }
})

.filter('title', function() {

  return function(input) {
    return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
  }
});