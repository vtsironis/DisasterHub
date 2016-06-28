angular.module('dHb.controllers', [])

.controller('LoginCtrl', function(store, $scope, $location, auth, $http, noaserver, $ionicPopup, $ionicLoading, $ionicHistory) {
  console.log('Inside LoginCtrl controller');
  $scope.data = {};
  
  $ionicHistory.nextViewOptions({
    disableBack: true,
    historyRoot: true
  });

  $scope.login = function() {
    $ionicLoading.show();

    auth.signin({
      // This asks for the refresh token
      // So that the user never has to log in again
      authParams: {
        scope: 'openid offline_access',
        device: 'Mobile device'
      },
      connection: 'Username-Password-Authentication',
      username: $scope.data.username,
      password: $scope.data.password,

    }, function(profile, token, refreshToken) {
      $ionicLoading.hide();

      store.set('profile', profile);
      store.set('token', token);
      store.set('refreshToken', refreshToken);
      $location.path('/');

    }, function(error) {
      $ionicLoading.hide();

      $ionicPopup.alert({
        title: 'Sign in Failed',
        //template: error.details.description
        template: JSON.stringify(error)
      });
    });
  }

  $scope.register = function() {
    $ionicLoading.show();

    auth.signup({
      // This asks for the refresh token
      // So that the user never has to log in again
      authParams: {
        scope: 'openid offline_access',
        device: 'Mobile device'
      },
      connection: 'Username-Password-Authentication',
      email: $scope.data.email,
      password: $scope.data.password,
      username: $scope.data.username
    }, function(profile, token, refreshToken) {
      // If sign up to Auth0 was successfull, store user data in NOA server too.
      $http({
        cache: true,
        data: {
          email: $scope.data.email,
          password: $scope.data.password,
          username: $scope.data.username
        },
        method: 'POST',
        url: noaserver.user.register
      }).then(function(response) {
        //console.log(JSON.stringify(response));

        $http({
          data: {
            user_metadata: {
              api: {
                id: response.data.id
              }
            }
          },
          headers: {
            Authorization: 'Bearer ' + token
          },
          method: 'PATCH',
          url: AUTH0_API_ENDPOINT + 'users/' + profile.user_id,
        }).then(function(response) {
          $ionicLoading.hide();

          // Finally update the user profile with the user_metadata object.
          profile.user_metadata = response.data.user_metadata;
          // Store the user profile in the local storage.
          store.set('profile', profile);
          // Store the JWT authentication token in the local storage.
          store.set('token', token);
          // Store the JWT authentication refresh token in the local storage.
          store.set('refreshToken', refreshToken);
          // Redirect user to the main app screen.
          $location.path('/');
        }, function(error) {
          $ionicLoading.hide();
          console.log('Failed to register metadata', error);
        });
      }, function(error) {
        $ionicLoading.hide();
        console.log('Failed to register user in NOA server');
      });

    }, function(error) {
      $ionicLoading.hide();
      console.log('Failed to register user in Auth0 service', error);

      var template;
      if ( error.name === 'invalid_password' ) {
        template = 'Password is not strong enough:<br>';
        template += error.details.policy.replace(/\n/g, '<br>');
      } else {

        if ( 'description' in error.details ) {
          template = error.details.description;
        } else {
          template = error.details.error;
        }
      }

      $ionicPopup.alert({
        title: 'Sign up Failed',
        template: template
      });
    });
  }
})

.controller('LogoutCtrl', function (auth, $scope, $state, $timeout, $location, store, $ionicHistory) {
  console.log('Inside LogoutCtrl controller');
  auth.signout();
  store.remove('profile');
  store.remove('token');
  store.remove('refreshToken');
  $location.path('/user/login');
  
  $timeout(function () {
      $ionicHistory.clearCache();
      $ionicHistory.clearHistory();
      console.log('cleared cache');
  }, 300);
})

.controller('AppCtrl', function($scope, store, $filter, $timeout, $ionicModal, $ionicPopover, geoserver) {
	console.log('Inside AppCtrl controller.');

  $scope.profile = store.get('profile');

  $scope.viewparams = {
    start_date: new Date()
  };

  $scope.cql_filter = {};

  $scope.layers = {
    backgrounds: {},
    overlays: {
      hidden: {}
    }
  };

  var layers = [], overlays = [];

  overlays.push(new ol.Overlay({
    // An overlay to anchor the geolocation marker to the map.
    id: 'geolocmarker',
    position: undefined
  }));

  overlays.push(new ol.Overlay({
    // An overlay to anchor the geotagging marker to the map.
    id: 'geotagmarker',
    offset: [-1, -26]
  }));

  layers.push(new ol.layer.Tile({
    id: 'ktimatologio',
    preload: Infinity,
    source: new ol.source.TileWMS({
      url: 'http://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx',
      params: {
        'LAYERS': 'KTBASEMAP',
        'FORMAT': 'image/png',
        'TILED': true
      },
      projection: 'EPSG:4326',
    }),
    title: 'EKXA VLSO',
    type: 'background',
    visible: false
  }));

  layers.push(new ol.layer.Tile({
    id: 'mapquest',
    preload: Infinity,
    source: new ol.source.MapQuest({
      layer: 'sat'
    }),
    title: 'MapQuest Sat',
    type: 'background',
    visible: true
  }));

  layers.push(new ol.layer.Tile({
    id: 'osm',
    preload: Infinity,
    source: new ol.source.OSM(),
    title: 'OSM',
    type: 'background',
    visible: false
  }));

  layers.push(new ol.layer.Tile({
    id: 'toponyms',
    preload: Infinity,
    source: new ol.source.XYZ({
      url: 'http://195.251.203.242:8888/v2/admin_over/{z}/{x}/{y}.png'
    }),
    title: 'Toponyms',
    type: 'overlay',
    visible: true
  }));

  layers.push(new ol.layer.Tile({
    id: 'clc2000',
    preload: Infinity,
    source: new ol.source.XYZ({
      url: 'http://195.251.203.242:8888/v2/clc_00/{z}/{x}/{y}.png'
    }),
    title: 'Corine Land Cover 2000',
    type: 'overlay',
    visible: false
  }));

  layers.push(new ol.layer.Image({
    id: 'natura2000',
    preload: Infinity,
    source: new ol.source.ImageWMS({
      ratio: 1,
      url: geoserver.WMS.firehub,
      params: {
        'FORMAT': 'image/png',
        'VERSION': '1.1.1',
        'TILED': false,
        LAYERS: geoserver.firehub.layers.natura2000_view,
        STYLES: '',
        VIEWPARAMS: null
      },
      serverType: 'geoserver'
    }),
    title: 'Natura 2000',
    type: 'overlay',
    visible: false,
  }));

  layers.push(new ol.layer.Image({
    id: 'urbanatlas',
    preload: Infinity,
    source: new ol.source.ImageWMS({
      ratio: 1,
      url: geoserver.WMS.firehub,
      params: {
        'FORMAT': 'image/png',
        'VERSION': '1.1.1',
        'TILED': false,
        LAYERS: geoserver.firehub.layers.urbanatlas_view,
        STYLES: '',
        VIEWPARAMS: null
      },
      serverType: 'geoserver'
    }),
    title: 'Urban Atlas',
    type: 'overlay',
    visible: false
  }));

  layers.push(new ol.layer.Image({
    id: 'sevraw',
    opacity: 0.7,
    preload: Infinity,
    source: new ol.source.ImageWMS({
      ratio: 1,
      url: geoserver.WMS.firehub,
      params: {
        'FORMAT': 'image/png',
        'VERSION': '1.1.1',
        'TILED': false,
        LAYERS: geoserver.firehub.layers.seviri_raw,
        STYLES: '',
        VIEWPARAMS: null
      },
      serverType: 'geoserver'
    }),
    title: 'Seviri Raw',
    type: 'hidden',
    visible: false
  }));

  layers.push(new ol.layer.Image({
    id: 'sevref',
    opacity: 0.7,
    preload: Infinity,
    source: new ol.source.ImageWMS({
      ratio: 1,
      url: geoserver.WMS.firehub,
      params: {
        'FORMAT': 'image/png',
        'VERSION': '1.1.1',
        'TILED': false,
        LAYERS: geoserver.firehub.layers.seviri_ref,
        STYLES: '',
        VIEWPARAMS: null
      },
      serverType: 'geoserver'
    }),
    title: 'Seviri Refined',
    type: 'hidden',
    visible: false
  }));

  layers.push(new ol.layer.Image({
    id: 'hrsat',
    preload: Infinity,
    source: new ol.source.ImageWMS({
      ratio: 1,
      url: geoserver.WMS.firehub,
      params: {
        'FORMAT': 'image/png',
        'VERSION': '1.1.1',
        'TILED': false,
        LAYERS: geoserver.firehub.layers.hr_sat_refined,
        STYLES: '',
        VIEWPARAMS: null,
        CQL_FILTER: null
      },
      serverType: 'geoserver'
    }),
    title: 'Polar-Orbiting Satellites',
    type: 'hidden',
    visible: false
  }));

  layers.push(new ol.layer.Vector({
    id: 'geotags',
    source: new ol.source.Vector({
      format: new ol.format.GeoJSON(),

      url: function() {
        var cql_filter = null;
        var viewparams = null;

        // Properly format the viewparams string according to viewparams property of the $scope object
        if (angular.isDate($scope.viewparams.start_date)) {
          viewparams = "start_date:'" + $filter('date')($scope.viewparams.start_date, 'yyyy-MM-ddTHH:mm:ss') + "'";
        }

        if (angular.isDate($scope.viewparams.stop_date)) {
          viewparams = viewparams ? viewparams + ";stop_date:'" + $filter('date')($scope.viewparams.stop_date, 'yyyy-MM-ddTHH:mm:ss') + "'"
                                  : "stop_date:'" + $filter('date')($scope.viewparams.stop_date, 'yyyy-MM-ddTHH:mm:ss') + "'";
        }

        // Properly format the cql_filter string according to cql_filter property of the $scope object.
        if (angular.isString($scope.cql_filter.username)) {
          cql_filter = "username='" + $scope.cql_filter.username + "'";
        }

        if (angular.isString($scope.cql_filter.id)) {
          cql_filter = cql_filter ? cql_filter + "and id='" + $scope.cql_filter.id + "'" : "id='" + $scope.cql_filter.id + "'";
        }

        if ($scope.cql_filter.dwithin) {
          console.log('CQL filters in dwithin: ', $scope.cql_filter);
          var dwithin = 'DWITHIN(coordinates,' +
                        $scope.cql_filter.dwithin.geom +
                        ',' +
                        $scope.cql_filter.dwithin.distance +
                        ',' +
                        $scope.cql_filter.dwithin.units + ')';

          cql_filter = cql_filter ? cql_filter + 'and ' + dwithin : dwithin;
        }

        if (angular.isString($scope.cql_filter.hazard)) {
          cql_filter = cql_filter ? cql_filter + "and hazard='" + $scope.cql_filter.hazard + "'" : "hazard='" + $scope.cql_filter.hazard + "'";
        }

        var url = geoserver.WFS.firehub +
                  '&sortby=ingestion_date+D' +
                  '&version=2.0.0' +
                  '&request=GetFeature' +
                  '&typeName=' + geoserver.firehub.layers.geotags_view +
                  //'&count=10' +
                  '&outputFormat=application/json' +
                  '&srsname=EPSG:3857' +
                  (viewparams?'&viewparams=' + viewparams:'') +
                  (cql_filter?'&cql_filter=' + cql_filter:'');

        //console.log('URL ------> ', url);

        return url;
      }
    }),

    style: new ol.style.Style({
      image: new ol.style.Icon({
        anchor: [262, 466],
        anchorXUnits: 'pixels',
        anchorYUnits: 'pixels',
        src: 'img/location.svg',
        snapToPixel: false,
        scale: 0.089
      })
    }),
    title: 'Geotags',
    type: 'hidden',
    visible: false
  }));
  
  var view = new ol.View({
    center: ol.proj.transform([23.52, 37.41], 'EPSG:4326', 'EPSG:3857'),
    zoom: 7,
  });

  var map = new ol.Map({
    controls: ol.control.defaults({
      attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
        collapsible: false
      })
    }),
    layers: layers,
    overlays: overlays,
    view: view
  });

  view.on('propertychange', function(event) {

    if (map.getView().getCenter() === $scope.ucoordinates[3857]) {
      $scope.coordinates = {};

      map.getOverlayById('geotagmarker').setPosition(undefined);

    } else {
      var coords = map.getView().getCenter();

      //$scope.coordinates[3857] = coords;
      //$scope.coordinates[4326] = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');

      $scope.coordinates = {
        3857: coords,
        4326: ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326'),
        hdms: ol.coordinate.toStringHDMS(ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326'))
      };

      map.getOverlayById('geotagmarker').setPosition($scope.coordinates[3857]);
    }

    $timeout(function(){
      $scope.$apply();
    });
  });

  $scope.coordinates = {};
  $scope.ucoordinates = {};

  // Assign the Openlayers map object to the $scope object.
  $scope.map = map;

  /**
   * Now properly initialize the layers dictionary in the $scope object
   * using the layer objects stored in the layers local variable.
   */
  for (var i = 0; i < layers.length; i++) {
    var id = layers[i].get('id');
    var type = layers[i].get('type');

    if (type === 'hidden') {
      $scope.layers.overlays.hidden[id] = layers[i];
    } else {
      type += 's';
      $scope.layers[type][id] = layers[i];

      if (type === 'backgrounds' && layers[i].getVisible()) {
        $scope.layers.backgrounds.active = id;
      }
    }
  }

  $scope.toggleOverlay = function(id) {
    var layer = $scope.layers.overlays[id];

    layer.setVisible(!layer.getVisible());
  };

  $scope.toggleBackground = function() {
    var active_id = $scope.layers.backgrounds.active;

    for (var id in $scope.layers.backgrounds) {
      if ( id === 'active' ) {
        continue;
      }
      $scope.layers.backgrounds[id].setVisible(false);
    }
    
    $scope.layers.backgrounds[active_id].setVisible(true);
  };

  // $scope variable containing the $ionicPopover objects.
  $scope.popovers = {};
  // $scope variable containing the $ionicModal objects.
  $scope.modals = {};

  $scope.openModal = function(id) {
    $scope.modals[id].show();
  };

  $scope.closeModal = function(id) {
    $scope.modals[id].hide();
  };

  // Execute action on hide modal
  $scope.$on('modal.hidden', function() {
    // Execute action
  });

  // Execute action on remove modal
  $scope.$on('modal.removed', function() {
    // Execute action
  });

  ['backgrounds', 'overlays'].forEach(function(id) {
    // Create the popover's template URL using the popover's id.
    var templateUrl = 'templates/popovers/' + id + '.html';

    // Create the ionicPopover object using the template.
    $ionicPopover.fromTemplateUrl(templateUrl, {
      scope: $scope
    }).then(function(popover) {
      $scope.popovers[id] = popover;
    });
  });

  $scope.openPopover = function(id, $event) {
    $scope.popovers[id].show($event);
  };

  $scope.closePopover = function(id) {
    $scope.popovers[id].hide();
  };

  // Execute action on hide popover
  $scope.$on('popover.hidden', function() {
    // Execute action
  });

  // Execute action on remove popover
  $scope.$on('popover.removed', function() {
    // Execute action
  });

  //Cleanup modals and popovers when we're done with them!
  $scope.$on('$destroy', function() {

    for (var i = 0; i < $scope.modals.length; i++) {
      $scope.modals[i].remove();
    }

    for (var i = 0; i < $scope.popovers.length; i++) {
      $scope.popovers[i].remove();
    }
  });
})

.controller('EventsCtrl', function($scope, $state, $stateParams, EventHub, $ionicLoading, $interval) {
  console.log('Inside EventsCtrl controller.');
  // More events can be loaded or not.
  $scope.moreEventsCanBeLoaded = true;

  // The title of the events view template.
  $scope.eventsViewTitle = function nameEventsViewTitle(params) {
    var eventsViewTitle = {
      crowd: 'Crowdsourcing',
      eo: 'Earth Observations',
      earthquake: 'Earthquakes',
      flood: 'Floods',
      wildfire: 'Forest Fires',
      heatwave: 'Heat Waves',
      smoke: 'Smoke Plumes'
    };

    return eventsViewTitle[params.alert] ? eventsViewTitle[params.alert] :
            (eventsViewTitle[params.hazard] ? eventsViewTitle[params.hazard] : 'All');

  }($stateParams);

  // Create the proper filters of the events according to the state parameters.
  var filters = function createFiltersFromStateParams(params) {
    var alerts = ['eo', 'crowd'];
    var hazards = ['earthquake', 'flood', 'wildfire', 'heatwave', 'smoke'];

    return {
      alert: (alerts.indexOf(params.alert) > -1) ? params.alert : 'all',
      hazard: (hazards.indexOf(params.hazard) > -1) ? params.hazard : 'all',
    };

  }($stateParams);

  // Get those events that have been already fetched from the server and are stored locally.
  //$scope.events = EventHub.getAll(filters);
  $scope.events = [];
  
  $scope.filterEvents = function(_event) {

    return (filters.alert === 'all' ? true : _event.alert === filters.alert)
            && (filters.hazard === 'all' ? true : _event.hazard === filters.hazard);

  };

  $scope.addGeotag = function() {
    $state.go('app.geotag');
  }

  var eventsLoaded = 0;
  $scope.loadEvents = function() {
    

    EventHub.load(null, null, 50, filters).then(function(events) {
      
      if (eventsLoaded ===  events.length) {
        $scope.moreEventsCanBeLoaded = false;
      } else {
        $scope.events = events;
        eventsLoaded = events.length;
      }

      $scope.$broadcast('scroll.infiniteScrollComplete');
    }, function(error) {
      $ionicLoading.show({
        duration: 5000,
        noBackdrop: true,
        template: 'Unfortunatelly events could not be loaded. Check your network.'
      });
    });
  };

  $scope.refreshEvents = function() {
    var now = new Date();

    console.log('Pull refresh events at: ' + now);

    EventHub.refresh().then(function(events) {
      $scope.events = events;

    }, function(error) {
      $ionicLoading.show({
        duration: 3000,
        noBackdrop: true,
        template: 'Unfortunatelly fires could not be refreshed. Check your network.'
      });
    }).finally(function() {
      $scope.$broadcast('scroll.refreshComplete');

      $scope.pollEvents();
    });
  };

  //$scope.refreshEvents();

  var eventsPolling;

  $scope.pollEvents = function() {
    $interval.cancel(eventsPolling);

    eventsPolling = $interval(function() {
      var now = new Date();

      console.log('Polling events at: ' + now);

      EventHub.refresh().then(function(events) {
        $scope.events = events;

      }).finally(function() {
        $scope.$broadcast('scroll.refreshComplete');
      });
    }, 60000);
  };

  //$scope.pollEvents();
  /*
  $scope.$on('$destroy', function() {
    console.log('Destroying poll events interval.');
    $interval.cancel(eventsPolling);
  });
  */

  $scope.$on('$ionicView.beforeEnter', function() {
    console.log('On before entering events views.');

    $scope.events = EventHub.getAll(filters);

    $scope.refreshEvents();
  });

  $scope.$on('$ionicView.leave', function() {
    console.log('On leaving events views.');

    $interval.cancel(eventsPolling);
  });
})

.controller('EventCtrl', function($scope, $state, $stateParams, $filter, $ionicModal, $ionicPopover, EventHub, WMS) {
  console.log('Inside EventCtrl controller.');

  // Get the respective event object using the eventId parameter from the state params.
  $scope.event = EventHub.get($stateParams.eventId);

  $scope.toggleHiddenOverlay = function(id) {

    switch(id) {
      case 'geotags':
        toggleGeotagsOverlay();
        break;

      case 'sevraw':
      case 'sevref':
        toggleSeviriOverlays(id);
        break;

      case 'hrsat':
        togglePosOverlay();
        break;
    };
  };

  function toggleGeotagsOverlay() {
    var geotags = $scope.layers.overlays.hidden.geotags;

    if ($scope.event.alert === 'eo') {
      geotags.setVisible(!geotags.getVisible());

    } else {

      if ($scope.cql_filter.id === $scope.event.id) {
        var geometry =  new ol.geom.Point($scope.event.coordinates[3857]);
        var WKTformat = new ol.format.WKT();
        var WKTgeometry = WKTformat.writeGeometry(geometry);

        $scope.viewparams.start_date = new Date($scope.event.ingestion_date);
        $scope.viewparams.start_date.setHours($scope.viewparams.start_date.getHours() - 12);
        $scope.viewparams.stop_date = new Date($scope.event.ingestion_date);
        $scope.viewparams.stop_date.setHours($scope.viewparams.stop_date.getHours() + 12);

        $scope.cql_filter.id = null;

        $scope.cql_filter.dwithin = {
          geom: WKTgeometry,
          distance: 10000,
          units: 'meters'
        };

        $scope.cql_filter.hazard = $scope.event.hazard;

        $scope.layers.overlays.hidden.geotags.getSource().clear();

        $scope.layers.overlays.hidden.geotags.setVisible(true);

      } else {
        $scope.cql_filter.id = $scope.event.id;

        $scope.layers.overlays.hidden.geotags.getSource().clear();

        $scope.layers.overlays.hidden.geotags.setVisible(true);
      }
    }
  };

  function toggleSeviriOverlays(id) {
    var sevraw = $scope.layers.overlays.hidden.sevraw;
    var sevref = $scope.layers.overlays.hidden.sevref;

    if (id === 'sevraw') {
      sevref.setVisible(false);

      sevraw.setVisible(!sevraw.getVisible());

    } else if (id === 'sevref') {
      sevraw.setVisible(false);

      sevref.setVisible(!sevref.getVisible());
    }
  };

  function togglePosOverlay() {
    var hrsat = $scope.layers.overlays.hidden.hrsat;

    hrsat.setVisible(!hrsat.getVisible());
  };

  $scope.addGeotag = function() {
    $state.go('app.geotag');
  }

  $scope.viewBaseLayers = function($event) {
    $scope.openPopover('backgrounds', $event);
  }

  $scope.viewOverlayLayers = function($event) {
    $scope.openPopover('overlays', $event);
  }

  $scope.hideInformation = function() {
    $scope.closeModal('information');
  };

  $scope.viewInformation = function() {
    console.log('Viewing event information.');
    // Create the event information object.
    $scope.event.information = function createEventInformation() {
      console.log('Creating event information');
      var information = {};

      if ($scope.event.alert === 'eo') {
        information = {
          general: [],
          sensing: [],
          geographic: []
        };

        switch ($scope.event.sensor) {
          case 'SEVIRI':
            information.general = [
              {key: 'type', val: 'Earth Observation', icon: 'ion-earth'},
              {key: 'satellite', val: 'MSG-2', icon: 'ion-satellite'},
              {key: 'sensor', val: 'SEVIRI', icon: 'ion-android-wifi'},
              {key: 'time resolution', val: '5 minutes (High)'},
              {key: 'spatial resolution', val: '3.5 kms (Low)'}
            ];
            break;

          case 'EOS':
            information.general = [
              {key: 'type', val: 'Earth Observation', icon: 'ion-earth'},
              {key: 'satellite', val: 'Aqua / Terra', icon: 'ion-satellite'},
              {key: 'sensor', val: 'MODIS', icon: 'ion-android-wifi'},
              {key: 'time resolution', val: '4 hours (Medium)'},
              {key: 'spatial resolution', val: '250 meters (Medium)'}
            ];
            break;

          case 'NPP':
            information.general = [
              {key: 'type', val: 'Earth Observation', icon: 'ion-earth'},
              {key: 'satellite', val: 'NPP', icon: 'ion-satellite'},
              {key: 'sensor', val: 'VIIRS', icon: 'ion-android-wifi'},
              {key: 'time resolution', val: '4 hours (Medium)'},
              {key: 'spatial resolution', val: '250 meters (Medium)'}
            ];
            break;

          case 'NOAA':
            information.general = [
              {key: 'type', val: 'Earth Observation', icon: 'ion-earth'},
              {key: 'satellite', val: 'NOAA 18/19', icon: 'ion-satellite'},
              {key: 'sensor', val: 'AVHRR', icon: 'ion-android-wifi'},
              {key: 'time resolution', val: '4 hours (Medium)'},
              {key: 'spatial resolution', val: '1100 meters (Medium)'}
            ];
            break;
        };

        information.sensing = [
          {
            key: 'start', 
            val: $filter('date')($scope.event.sensing_start, 'd MMM, yyyy HH:mm'), 
            icon: 'ion-play'},
          {
            key: 'stop',
            val: $scope.event.sensing_last ? $filter('date')($scope.event.sensing_last, 'd MMM, yyyy HH:mm') : '-', 
            icon: 'ion-stop'
          },
          {
            key: 'duration', 
            val: $scope.event.sensing_duration ? $filter('number')($scope.event.sensing_duration, 2) + ' hours' : '-', 
            icon: 'ion-ios-stopwatch-outline'
          },
        ];

        information.geographic = [
          {key: 'municipality', val: $scope.event.municipality, icon: 'ion-home'},
          {key: 'area', val: $scope.event.area + ' hectares', icon: 'ion-ios-grid-view-outline'},
          {key: 'centroid', val: $scope.event.centroid.hdms, icon: 'ion-location'},
        ];

      } else if ($scope.event.alert === 'crowd') {
        
        information = {
          general: [
            {key: 'type', val: 'Crowdsourcing', icon: 'ion-ios-people'},
            {key: 'username', val: $scope.event.username, icon: 'ion-person'},
            {key: 'hazard', val: $scope.event.hazard_alias, icon: 'ion-flash'}
          ],
          geotagging: [
            {key: 'ingestion', val: $scope.event.ingestion_date, icon: 'ion-calendar'},
            {key: 'location', val: $scope.event.coordinates.hdms, icon: 'ion-location'},
            {
              key: 'user location',
              val: ($scope.event.ucoordinates ? ol.coordinate.toStringHDMS(ol.proj.transform($scope.event.ucoordinates[3857], 'EPSG:3857', 'EPSG:4326')) : 'Unknown'),
              icon: 'ion-pinpoint'
            }
          ]
        };
      }

      return information;

    }();
    // Open information modal.
    $scope.openModal('information');
  };

  $scope.hideMoreOptions = function() {
    $scope.closePopover('more-options');
  };

  $scope.viewMoreOptions = function($event) {
    console.log('Viewing event more options.');
    // Open more-options popover.
    $scope.openPopover('more-options', $event);
  };

  $scope.viewSeviriOptions = function($event) {
    console.log('Viewing seviri options.');
    // Open more-options popover.
    $scope.openPopover('seviri-options', $event);
  };

  $ionicPopover.fromTemplateUrl('templates/popovers/more-options.html', {
    scope: $scope
  }).then(function(popover) {
    $scope.popovers['more-options'] = popover;
  });

  $ionicModal.fromTemplateUrl('templates/modals/information.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modals['information'] = modal;
  });

  $scope.$on('$ionicView.beforeEnter', function() {
    console.log('On before entering event view.');

    if ($scope.event.alert === 'eo') {

      if ($scope.event.sensor === 'SEVIRI') {

        angular.forEach($scope.layers.overlays.hidden, function(layer, id) {

          if (id === 'sevraw' || id === 'sevref') {
            layer.getSource().updateParams({
              CQL_FILTER: 'fe_id=' + parseInt($scope.event.id.substring(2)),
              VIEWPARAMS: "this_date:'" + $scope.event.sensing_start + "'"
            });

            layer.setVisible((id === 'sevraw'));
          }
        });

        WMS.getExtentGeometry({
          sensor: $scope.event.sensor,
          sensing_start: $scope.event.sensing_start,
          sensing_last: $scope.event.sensing_last,
          id: $scope.event.id
        }).then(function(geometry) {
          //console.log('Extent geometry: ', geometry);
          var hrsat = $scope.layers.overlays.hidden.hrsat;
          var start_date = new Date($scope.event.sensing_start);
          start_date.setHours(start_date.getHours() - 12);
          var stop_date = new Date($scope.event.sensing_last);
          stop_date.setHours(stop_date.getHours() + 12);
          //console.log(start_date, stop_date);

          hrsat.getSource().updateParams({
            CQL_FILTER: 'DWITHIN(geom_mask,' + geometry + ',10000,meters)',
            VIEWPARAMS: "start_date:'" + 
                        $filter('date')(start_date, 'yyyy-MM-ddTHH:mm:ss') + 
                        "';end_date:'" +
                        $filter('date')(stop_date, 'yyyy-MM-ddTHH:mm:ss') + "'"
          });

          //console.log(hrsat.getSource().getUrl());
          //console.log(hrsat.getSource().getParams());

          hrsat.setVisible(false);

          $scope.viewparams.start_date = start_date;
          $scope.viewparams.stop_date = stop_date;

          $scope.cql_filter.dwithin = {
            geom: geometry,
            distance: 1000,
            units: 'meters'
          };

          $scope.cql_filter.hazard = $scope.event.hazard;

          $scope.layers.overlays.hidden.geotags.getSource().clear();

          $scope.layers.overlays.hidden.geotags.setVisible(false);
        });
      } else {
        var hrsat = $scope.layers.overlays.hidden.hrsat;

        hrsat.getSource().updateParams({
          CQL_FILTER: 'feos_id=' + parseInt($scope.event.id.substring(2)),
          VIEWPARAMS: "start_date:'" + 
                      $scope.event.sensing_start + 
                      "';end_date:'" + 
                      ($scope.event.sensing_last ? $scope.event.sensing_last : $scope.event.sensing_start) + "'"
        });

        hrsat.setVisible(true);

        WMS.getExtentGeometry({
          sensor: $scope.event.sensor,
          sensing_start: $scope.event.sensing_start,
          sensing_last: $scope.event.sensing_last,
          id: $scope.event.id
        }).then(function(geometry) {
          //console.log('Extent geometry: ', geometry);

          angular.forEach($scope.layers.overlays.hidden, function(layer, id) {

            if (id === 'sevraw' || id === 'sevref') {
              layer.getSource().updateParams({
                CQL_FILTER: 'DWITHIN(geom,' + geometry + ',10000,meters)',
                VIEWPARAMS: "this_date:'" + $scope.event.sensing_start + "'"
              });

              layer.setVisible(false);
            }
          });

          $scope.viewparams.start_date = new Date($scope.event.sensing_start);
          $scope.viewparams.start_date.setHours($scope.viewparams.start_date.getHours() - 12);
          $scope.viewparams.stop_date = new Date(($scope.event.sensing_last ? $scope.event.sensing_last : $scope.event.sensing_start));
          $scope.viewparams.stop_date.setHours($scope.viewparams.stop_date.getHours() + 12);

          $scope.cql_filter.dwithin = {
            geom: geometry,
            distance: 1000,
            units: 'meters'
          };

          $scope.cql_filter.hazard = $scope.event.hazard;

          $scope.layers.overlays.hidden.geotags.getSource().clear();

          $scope.layers.overlays.hidden.geotags.setVisible(false);
        });
      }
      // Set center of the map view.
      $scope.map.getView().setCenter($scope.event.centroid[3857]);

    } else if ($scope.event.alert === 'crowd') {
      $scope.viewparams.start_date = $scope.event.ingestion_date;

      $scope.cql_filter.id = $scope.event.id;

      $scope.layers.overlays.hidden.geotags.getSource().clear();

      $scope.layers.overlays.hidden.geotags.setVisible(true);

      var geometry =  new ol.geom.Point($scope.event.coordinates[3857]);
      var WKTformat = new ol.format.WKT();
      var WKTgeometry = WKTformat.writeGeometry(geometry);

      angular.forEach($scope.layers.overlays.hidden, function(layer, id) {

        if (id === 'sevraw' || id === 'sevref') {
          layer.getSource().updateParams({
            CQL_FILTER: 'DWITHIN(geom,' + WKTgeometry + ',1000,meters)',
            VIEWPARAMS: "this_date:'" + $scope.event.ingestion_date + "'"
          });

          layer.setVisible(false);
        }
      });

      var start_date = new Date($scope.event.ingestion_date);
      start_date.setHours(start_date.getHours() - 12);
      var stop_date = new Date($scope.event.ingestion_date);
      stop_date.setHours(stop_date.getHours() + 12);

      $scope.layers.overlays.hidden.hrsat.getSource().updateParams({
        CQL_FILTER: 'DWITHIN(geom_mask,' + WKTgeometry + ',1000,meters)',
        VIEWPARAMS: "start_date:'" + 
                    $filter('date')(start_date, 'yyyy-MM-ddTHH:mm:ss') + 
                    "';end_date:'" +
                    $filter('date')(stop_date, 'yyyy-MM-ddTHH:mm:ss') + "'"
      });

      // Set center of the map view.
      $scope.map.getView().setCenter($scope.event.coordinates[3857]);
    }

    // Set zoom of the map view.
    $scope.map.getView().setZoom(11);
    // Set the target element to render this map into.
    $scope.map.setTarget('olMap');
    $scope.map.getOverlayById('geolocmarker').setElement(undefined);
    $scope.map.getOverlayById('geotagmarker').setElement(undefined);
  });

  $scope.$on('$ionicView.beforeLeave', function() {
    console.log('On before leaving event view.');

    // Make the hidden layers invisible again.
    angular.forEach($scope.layers.overlays.hidden, function(layer, id) {

      if (id !== 'geotags') {
        layer.getSource().updateParams({
          CQL_FILTER: null,
          VIEWPARAMS: null
        });
      }

      layer.setVisible(false);
    });

    // Clear the cql filters related with the geotags_view WFS layer.
    for (var filter in $scope.cql_filter) {
      delete $scope.cql_filter[filter];
    }

    // Remove the map from the target element.
    $scope.map.setTarget(undefined);
  });
})

.controller('GeotagCtrl', function($scope, $state, $stateParams, $cordovaGeolocation, $ionicActionSheet, $ionicLoading, $ionicHistory) {
  console.log('Inside GeotagCtrl controller.');

  $scope.getGeolocation = function() {
    console.log('Going to retrieve GPS location');

    $ionicLoading.show({
      noBackdrop: true,
      template: 'Retrieving GPS location...'
    });

    $cordovaGeolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    }).then(function(position) {
      console.log('Retrieved GPS location: ', position);
      var coords = [position.coords.longitude, position.coords.latitude];

      $scope.ucoordinates[3857] = ol.proj.transform(coords, 'EPSG:4326', 'EPSG:3857');
      $scope.ucoordinates[4326] = coords;
      $scope.ucoordinates.hdms = ol.coordinate.toStringHDMS(coords);

      $scope.map.getOverlayById('geolocmarker').setPosition($scope.ucoordinates[3857]);

      $scope.map.beforeRender(new ol.animation.pan({
        duration: 1000,
        source: $scope.map.getView().getCenter()
      }));

      $scope.map.getView().setCenter($scope.ucoordinates[3857]);

      $ionicLoading.hide();

    }, function(error) {
      console.log(error)
      $ionicLoading.hide();

      $ionicLoading.show({
        duration: 3000,
        noBackdrop: true,
        template: 'Failed to retrieve GPS location.'
      });
    });
  };

  $scope.selectHazard = function() {
    // Show the action sheet
    $ionicActionSheet.show({
      buttons: [
        { text: '<i class="icon ion-earthquake earthquake"></i> Earthquake' },
        { text: '<i class="icon ion-flood flood"></i> Flood' },
        { text: '<i class="icon ion-wildfire wildfire"></i> Forest Fire' },
        { text: '<i class="icon ion-heatwave heatwave"></i> Heat Wave' },
        { text: '<i class="icon ion-smoke smoke"></i> Smoke Plume' }
      ],
      //destructiveText: 'Delete',
      titleText: 'Select the hazard',
      cancelText: 'Cancel',
      cancel: function() {

      },
      buttonClicked: function(index) {
        $state.go('app.post', {hazardId: index});

        return true;
      }
    });
  };

  $scope.$on('$ionicView.enter', function() {
    console.log('On entering geotag view.');
    // Set the DOM element with geolocotaion overlay.
    $scope.map.getOverlayById('geolocmarker').setElement(document.getElementById('olGeolocMarker'));
    // Set the DOM element with geotag overlay.
    $scope.map.getOverlayById('geotagmarker').setElement(document.getElementById('olGeotagMarker'));
    // Get or not current user's geolocation.
    if ($ionicHistory.backView().stateName === 'app.events'
        && $ionicHistory.forwardView() === null) {

      $scope.getGeolocation();
    }
    // Set the target element to render this map into.
    $scope.map.setTarget('olMap');
  });

  $scope.$on('$ionicView.beforeLeave', function() {
    console.log('On before leaving geotag view.');
    // Remove the map from the target element.
    $scope.map.setTarget(undefined);
  });
})

.controller('PostCtrl', function($scope, $state, $stateParams, $timeout, GeotagHub, Info, Photo, $ionicLoading, $ionicModal) {
	console.log('Inside PostCtrl controller.');

  $scope.geotag = {};

  $scope.geotag.abstract = function createGeotagAbstract(params) {
    var hazards = {
      0: 'Earthquake',
      1: 'Flood',
      2: 'Forest Fire',
      3: 'Heat Wave',
      4: 'Smoke Plume'
    };

    return {
      date: new Date(),
      header: hazards[parseInt(params.hazardId)],
      //paragraphs: [ol.coordinate.format(($scope.coordinates[4326] ? $scope.coordinates[4326] : $scope.ucoordinates[4326]), 'Location: {y}, {x}', 2),
      //             ol.coordinate.format($scope.ucoordinates[4326], 'User Location: {y}, {x}', 2)]
      paragraphs: ['Location: ' + ($scope.coordinates.hdms ? $scope.coordinates.hdms : $scope.ucoordinates.hdms),
                   'User Location: ' + $scope.ucoordinates.hdms]
    };

  }($stateParams);

  $scope.addInfo = function() {
    console.log('Going to add text info.');

    if (!$scope.geotag.info){
      $scope.geotag.info = {};
    }

    $scope.openModal('compose');
  }

  $scope.hideInfo = function() {
    $scope.closeModal('compose');
  }

  var geotags = $scope.layers.overlays.hidden.geotags;
  
  $scope.addPhoto = function() {
    console.log('Going to add photo.');

    if (!$scope.geotag.photo){
      $scope.geotag.photo = {};
    }

    Photo.shoot().then(function(photo) {
      $scope.geotag.photo = photo;
    });
  }

  $scope.addEmergency = function() {
    alert('Unfortunatelly not supported yet.');
  };

  $scope.shareGeotag = function() {
    alert('Unfortunatelly not supported yet.');
  };

  $scope.postGeotag = function() {
    // Show loading indicator.
    $ionicLoading.show();
    // The message that the loading indicator sould show to the user.
    var message = 'Successfully ingested geotag.';

    // Post geotag to DisasterHub server.
    GeotagHub.postGeotag({
      coordinates: $scope.coordinates,
      ingestion_date: $scope.geotag.abstract.date,
      ucoordinates: $scope.ucoordinates,
      user_id: $scope.profile.user_metadata.api.id,
      hazard_id: $stateParams.hazardId
    }).then(function(geotag) {
      // Make geotag overlay invisible.
      $scope.map.getOverlayById('geotagmarker').setPosition(undefined);

      // Add feature object of the geotag object to the geotags layer.
      $scope.layers.overlays.hidden.geotags.getSource().addFeature(geotag.feature);

      $scope.cql_filter.id = geotag.id;

      $scope.layers.overlays.hidden.geotags.getSource().clear();

      $scope.layers.overlays.hidden.geotags.setVisible(true);

      // Check if there is a short text info that should be sent.
      if ($scope.geotag.info
          && $scope.geotag.info.content) {

        $scope.geotag.info.geotag_id = geotag.id;

        Info.post($scope.geotag.info);
      }

      // Check if there is a photo that should be sent
      if ($scope.geotag.photo
          && $scope.geotag.photo.photoURI) {

        $scope.geotag.photo.geotag_id = geotag.id;
        
        Photo.upload($scope.geotag.photo);
      }

    }, function(error) {
      message = 'Failed to ingest geotag.';
      
    }).finally(function() {
      $ionicLoading.hide().then(function() {
        $ionicLoading.show({
          duration: 3000,
          noBackdrop: true,
          template: message
        }).then(function() {
          $timeout(function () {
            $state.go('app.geotag');
          }, 3000);

          //$state.go('app.geotag');
        });
      });
    });
  };

  // Create the ionicModal object using the template.
  $ionicModal.fromTemplateUrl('templates/modals/compose.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modals['compose'] = modal;
  });
})

.controller('AboutCtrl', function($scope, $ionicModal) {
    console.log('Inside AboutCtrl controller.');

    $ionicModal.fromTemplateUrl('templates/modals/privacy.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });

    $scope.openModal = function() {
      $scope.modal.show();
    };

    $scope.closeModal = function() {
      $scope.modal.hide();
    };

    // Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.modal.remove();
    });

    // Execute action on hide modal
    $scope.$on('modal.hidden', function() {
      // Execute action
    });

    // Execute action on remove modal
    $scope.$on('modal.removed', function() {
      // Execute action
    });
})