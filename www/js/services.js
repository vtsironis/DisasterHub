angular.module('dHb.services', [])

.factory('EventHub', function($filter, $http, $q, geoserver) {
  var checkpoint = {
    id: null,
    timestamp: new Date()
  };

  var events = [];
  var startIndexes = {
    all: 0,
    crowd: 0,
    eo: 0,
    earthquake: 0,
    flood: 0,
    wildfire: 0,
    heatwave: 0,
    smoke: 0
  };
  
  return {

    get: function(eventId) {

      for (var i = 0; i < events.length; i++) {
        if (events[i].id === eventId) {
          return events[i];
        }
      }
      
      return null;
    },

    getAll: function(params) {
      console.log('Getting already fetched events.');

      if ((params.alert === 'all' && params.hazard === 'all')
          && (events.length - startIndexes.all) > 0) {

        events.splice(startIndexes.all, events.length - startIndexes.all)
      }

      return events;
    },
    
    load: function(start, stop, count, filters) {
      var def = $q.defer();
      
      var start_date = start ? $filter('date')(start, 'yyyy-MM-ddTHH:mm:ss') : null;
      var stop_date = stop ? $filter('date')(stop, 'yyyy-MM-ddTHH:mm:ss') : null;
      
      var viewparams = start_date ? "start_date:'" + start_date + "'" +
        (stop_date ? ";stop_date:'" + stop_date + "'" : '') : (stop_date ? "stop_date:'" + stop_date + "'" : '');

      var cql_filter = null;

      var startIndex = startIndexes.all;

      if (filters.alert !== 'all') {
        cql_filter = "alert='" + filters.alert + "'";
        startIndex = startIndexes[filters.alert];
      }

      if (filters.hazard !== 'all') {
        cql_filter = "hazard='" + filters.hazard + "'";
        startIndex = startIndexes[filters.hazard];
      }

      var params = {
        count: count,
        outputFormat: 'application/json',
        request: 'GetFeature',
        startIndex: startIndex,
        typeName: geoserver.firehub.layers.events_view,
        version: '2.0.0'
      };

      if (viewparams) {
        params.viewparams = viewparams;
      }

      if (cql_filter) {
        params.cql_filter = cql_filter;
      }
      
      $http({
        cache: true,
        method: 'GET',
        params: params,
        url: geoserver.WFS.firehub + '&sortBy=timestamp+D'
      }).then(function(response) {
        // Get the features returned from the HTTP response.
        var features = response.data.features;

        for (var i = 0; i < features.length; i++) {
          // Initialize an event object.
          var _event = {
            id: features[i].properties.id,
            alert: features[i].properties.alert,
            hazard: features[i].properties.hazard
          };

          // Read the event's metadata.
          var metadata = JSON.parse(features[i].properties.metadata);

          // Define the date fields of the metadata object.
          var date_fields = ['sensing_start', 'sensing_last', 'ingestion_date'];

          Object.keys(metadata).forEach(function(key) {
            if (key === 'ucoordinates') {
              if (metadata[key]) {
                var WKTformat = new ol.format.WKT();
                var geometry = WKTformat.readGeometry(metadata[key]);
                var coords = geometry.getCoordinates();

                _event[key] = {
                  3857: coords,
                  4326: ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326'),
                  hdms: ol.coordinate.toStringHDMS(ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326'))
                }
              }

              return;
            }

            if (key === 'point') {
              _event[metadata[key]] = {
                3857: features[i].geometry.coordinates,
                4326: ol.proj.transform(features[i].geometry.coordinates, 'EPSG:3857', 'EPSG:4326'),
                hdms: ol.coordinate.toStringHDMS(ol.proj.transform(features[i].geometry.coordinates, 'EPSG:3857', 'EPSG:4326'))
              };

              return;
            }

            // Properly convert the value of the date field to
            // the device's local time zone using moment-timezone js.
            if (key in date_fields) {
              _event[key] = moment.utc(metadata[key]).local().format('YYYY-MM-DDTHH:mm:ss');
              
              return;
            }

            _event[key] = metadata[key];
          });

          // Create the abstract info to be used in the main app screen.
          if (_event.alert === 'eo') {
            _event.abstract = {
              //date: _event.sensing_last ? _event.sensing_last : _event.sensing_start,
              date: _event.sensing_start,
              header: {
                icon: 'ion-satellite',
                text: _event.sensor
              },
              paragraphs: ['Satellite alert ' + _event.id,
                           'Centroid: ' + _event.centroid.hdms,
                           'Municipality: ' +
                           _event.municipality + 
                           ', Area: ' +
                           _event.area +
                           ' ha, Duration: ' +
                           (_event.sensing_duration ?  $filter('number')(_event.sensing_duration, 2) + ' hours' : ' - ')]
            };

          } else if (_event.alert === 'crowd') {
            _event.abstract = {
              date: _event.ingestion_date,
              header: {
                icon: 'ion-crowd',
                text: _event.username
              },
              paragraphs: ['User geotag ' + _event.id, 'Coordinates: ' + _event.coordinates.hdms]
            };
          }

          // Properly increase the start indexes.
          startIndexes[_event.alert]++;
          startIndexes[_event.hazard]++;

          if (filters.alert === 'all' && filters.hazard === 'all') {
            startIndexes.all++;
          }

          events.push(_event);
        }

        def.resolve(events);

      }, function(error) {
        def.reject(error);
      })

      return def.promise;
    },

    refresh: function() {
      var def = $q.defer();

      var params = {
        outputFormat: 'application/json',
        request: 'GetFeature',
        typeName: geoserver.firehub.layers.events_view,
        version: '2.0.0',
        viewparams: "start_date:'" + $filter('date')(checkpoint.timestamp, 'yyyy-MM-ddTHH:mm:ss') + "'"
      };

      if (checkpoint.id) {
        params.cql_filter = "id<>'" + checkpoint.id + "'";
      }

      $http({
        //cache: true,
        method: 'GET',
        params: params,
        url: geoserver.WFS.firehub + '&sortBy=timestamp+A'
      }).then(function(response) {
        // Get the features returned from the HTTP response.
        var features = response.data.features;

        for (var i = 0; i < features.length; i++) {
          // Initialize an event object.
          var _event = {
            id: features[i].properties.id,
            alert: features[i].properties.alert,
            hazard: features[i].properties.hazard
          };

          // Read the event's metadata.
          var metadata = JSON.parse(features[i].properties.metadata);

          // Define the date fields of the metadata object.
          var date_fields = ['sensing_start', 'sensing_last', 'ingestion_date'];

          Object.keys(metadata).forEach(function(key) {
            if (key === 'ucoordinates') {
              if (metadata[key]) {
                var WKTformat = new ol.format.WKT();
                var geometry = WKTformat.readGeometry(metadata[key]);
                var coords = geometry.getCoordinates();

                _event[key] = {
                  3857: coords,
                  4326: ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326'),
                  hdms: ol.coordinate.toStringHDMS(ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326'))
                }
              }

              return;
            }

            // 
            if (key === 'point') {
              _event[metadata[key]] = {
                3857: features[i].geometry.coordinates,
                4326: ol.proj.transform(features[i].geometry.coordinates, 'EPSG:3857', 'EPSG:4326'),
                hdms: ol.coordinate.toStringHDMS(ol.proj.transform(features[i].geometry.coordinates, 'EPSG:3857', 'EPSG:4326'))
              };

              return;
            }

            // Properly convert the value of the date field to
            // the device's local time zone using moment-timezone js.
            if (key in date_fields) {
              _event[key] = moment.utc(metadata[key]).local().format('YYYY-MM-DDTHH:mm:ss');
              
              return;
            }

            _event[key] = metadata[key];
          });

          // Create the abstract info to be used in the main app screen.
          if (_event.alert === 'eo') {
            _event.abstract = {
              //date: _event.sensing_last ? _event.sensing_last : _event.sensing_start,
              date: _event.sensing_start,
              header: {
                icon: 'ion-satellite',
                text: _event.sensor
              },
              paragraphs: ['Satellite alert ' + _event.id,
                           'Centroid: ' + _event.centroid.hdms,
                           'Municipality: ' +
                           _event.municipality + 
                           ', Area: ' +
                           _event.area +
                           ' ha, Duration: ' +
                           (_event.sensing_duration ? $filter('number')(_event.sensing_duration, 2) + ' hours' : ' - ')]
            };

          } else if (_event.alert === 'crowd') {
            _event.abstract = {
              date: _event.ingestion_date,
              header: {
                icon: 'ion-crowd',
                text: _event.username
              },
              paragraphs: ['User geotag ' + _event.id, 'Coordinates: ' + _event.coordinates.hdms]
            };
          }

          // Update the checkpoint.
          checkpoint.id = features[i].properties.id;
          checkpoint.timestamp = features[i].properties.timestamp;

          // Properly increase the start indexes.
          startIndexes[_event.alert]++;
          startIndexes[_event.hazard]++;
          startIndexes.all++;

          events.unshift(_event);
        }

        def.resolve(events);

      }, function(error) {
        console.log(error);
        def.reject(error);
      });

      return def.promise;
    }
  }
})

.factory('GeotagHub', function($filter, $http, $q, noaserver, geoserver) {
  var geotag = {};

  return {

    postGeotag: function(data) {
      // Get a defered promise.
      var def = $q.defer();

      // Point geometry from the geotag coordinates.
      var geometry = new ol.geom.Point(data.coordinates[3857]);

      // Point geometry from the user coordinates.
      var ugeometry = data.ucoordinates[3857] ? new ol.geom.Point(data.ucoordinates[3857]) : null;

      // The WKT format will be used to post the coordinates to the NOA server.
      var WKTfmt = new ol.format.WKT();

      // Properly initialize the geotag object through the data object.
      geotag = {
        // coordinates as Point geometry in WKT format.
        coordinates: WKTfmt.writeGeometry(geometry),
        // ingestion data in ISO format.
        ingestion_date: $filter('date')(data.ingestion_date, 'yyyy-MM-ddTHH:mm:ss'),
        // user coordinates as Point geometry in WKT format.
        ucoordinates: ugeometry ? WKTfmt.writeGeometry(ugeometry) : null,
        // user id.
        user_id: data.user_id,
        hazard_id: data.hazard_id
      };

      $http({
        method: 'POST',
        url: noaserver.ingest.geotag,
        data: geotag
      }).then(function(response) {
		    //console.log(response);
        // Create the WFS feature for the geotag using OpenLayers libary.
        
        // Get the geotag id from the response and assign it to the geotag object.
        geotag.id = parseInt(response.data.id);

        // Now create a WFS feature object  using the OpenLayers library.
        var feature = new ol.Feature({
          geometry: geometry
        });

        // Properly set the feature id.
        feature.setId('geotags_view.' + geotag.id);

        // Properly set the feature properties.
        feature.setProperties(response.config.data);

        // Assign the feature object into the geotag object.
        geotag.feature = feature;

        def.resolve(geotag);

      }, function(error) {
		    console.log(error);
        def.reject(error);
      });

      return def.promise;
    }
  };
})

.factory('Info', function($http, $q, noaserver) {
  var info = {};

  return {
    post: function(data) {
      // Get a defered promise.
      var def = $q.defer();

      // Properly initialize the info object through the data object.
      info = {
        // The info text content.
        content: data.content,
        // The associated geotag id.
        geotag_id: data.geotag_id
      };

      $http({
        method: 'POST',
        url: noaserver.ingest.info,
        data: info
      }).then(function(response) {
        // Get the info id from the response and assign it to the info object.
        info.id = parseInt(response.data.id);
        
        def.resolve(info);

      }, function(error) {
        def.reject(error);
      });

      return def.promise;
    }
  };
})

.factory('Photo', function($cordovaCamera, $cordovaFileTransfer, $ionicPlatform, $q, store, noaserver) {
  var photo = {};

  return {
    shoot: function() {
      // Get a defered promise.
      var def = $q.defer();

      $ionicPlatform.ready(function() {
        var options = {
          correctOrientation: true,
          destinationType: Camera.DestinationType.FILE_URI,
          quality: 90,
          saveToPhotoAlbum: false,
          sourceType: Camera.PictureSourceType.CAMERA
        };

        $cordovaCamera.getPicture(options).then(function(photoURI) {
          photo.photoURI = photoURI;

          def.resolve(photo);

        }, function(error) {
          def.reject(error);
        });
      });

      return def.promise;
    },

    upload: function(data) {
      // Get a defered promise.
      var def = $q.defer();
      /*
      if (!data.photoURI) {
        $ionicLoading.show({
          duration: 2000,
          noBackdrop: true,
          template: 'No photo available.'
        });

        return;
      }
      */

      $ionicPlatform.ready(function() {
        // Photo upload options.
        var options = {
          fileName: data.photoURI.split('/').pop(),
          headers: {
            Authorization: 'Bearer ' + store.get('token')
          },
          params: {
            geotag_id: data.geotag_id
          }
        };
        
        $cordovaFileTransfer.upload(noaserver.ingest.photo, data.photoURI, options).then(function(response) {
          // Success callback.
          photo.id = parseInt(response.data.id);

          def.resolve(photo);

        }, function(error) {
          def.reject(error);
        }, function(progress) {
          // PROGRESS HANDLING GOES HERE
        });
      });

      return def.promise;
    }
  };
})

.factory('WMS', function($http, $q, geoserver) {

  return {

    getExtentGeometry: function(params) {
      // Get a defered promise.
      var def = $q.defer();

      var httpParams = {
        outputFormat: 'application/json',
        request: 'GetFeature',
        version: '2.0.0',
      };

      if (params.sensor === 'SEVIRI') {

        httpParams.typeName = geoserver.firehub.layers.seviri_range;

        httpParams.viewparams = "start_date:'" + params.sensing_start + "';end_date:'" + params.sensing_last + "'";

        httpParams.cql_filter = 'fe_id=' + parseInt(params.id.substring(2));

      } else {

        httpParams.typeName = geoserver.firehub.layers.hr_sat_refined;

        httpParams.viewparams = "start_date:'" + params.sensing_start + "';end_date:'" +
                            (params.sensing_last ? params.sensing_last : params.sensing_start) + "'";

        httpParams.cql_filter = 'feos_id=' + parseInt(params.id.substring(2));
      }

      // Compute the features of the geotags_view WFS layer that are within a specific distance from the fire polygons.
      $http({
        cache: true,
        method: 'GET',
        params: httpParams,
        url: geoserver.WFS.firehub
      }).then(function(response) {
        var source = new ol.source.Vector();
        var format = new ol.format.GeoJSON();
        var features = format.readFeatures(response.data, {featureProjection: 'EPSG:3857'});

        source.addFeatures(features);

        var geometry = ol.geom.Polygon.fromExtent(source.getExtent());
        var WKTformat = new ol.format.WKT();
        var WKTgeometry = WKTformat.writeGeometry(geometry);

        def.resolve(WKTgeometry);

      }, function(error) {
        console.log(error);
        def.reject(error);
      });

      return def.promise;
    }
  };
})