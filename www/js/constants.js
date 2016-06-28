angular.module('dHb.constants', [])

.constant('geoserver', (function() {
  var url;

  var use_proxy = !ionic.Platform.isWebView() &&
                  !ionic.Platform.isIPad() &&
                  !ionic.Platform.isIOS() &&
                  !ionic.Platform.isAndroid() &&
                  !ionic.Platform.isWindowsPhone() &&
                  !ionic.Platform.isEdge();

  if (use_proxy) {
    url = 'http://localhost:8100/geoserver';
  } else {
    url = 'http://195.251.203.238:8080/geoserver';
  }

  var services = {
    WFS: '/ows?service=WFS',
    WMS: '/ows?service=WMS'
  };

  var workspaces = {
    firehub: '/firehub'
  };

  return {
    url: url,
    firehub: {
      layers: {
        events_view: 'firehub:events_view',
        //events_view: 'firehub:test',
        fire_events_view: 'firehub:fire_events_view',
        geotags_view: 'firehub:geotags_view',
        hr_sat_refined: 'firehub:hr_sat_refined',
        natura2000_view: 'firehub:natura2000_view',
        seviri_range: 'firehub:seviri_range',
        seviri_raw: 'firehub:seviri',
        seviri_ref: 'firehub:propagation',
        urbanatlas_view: 'firehub:urbanatlas_view'
      }
    },

    WFS: {
      firehub: url + workspaces.firehub + services.WFS
    },

    WMS: {
      firehub: url + workspaces.firehub + services.WMS
    }
  }
})())

.constant('noaserver', (function() {
  // Define the Server URL of the current service.
  var url;

  // Define the paths to the various components of the current service.
  var paths = {
    ingest: '/ingest',
    user: '/user'
  };

  var use_proxy = !ionic.Platform.isWebView() &&
                  !ionic.Platform.isIPad() &&
                  !ionic.Platform.isIOS() &&
                  !ionic.Platform.isAndroid() &&
                  !ionic.Platform.isWindowsPhone() &&
                  !ionic.Platform.isEdge();
  
  /**
   * If the app is running in a web view, use the proxy
   * in order to bypass the CORS issue, otherwise use the
   * actual host of the current service.
   */
  if (use_proxy) {
    url = 'http://localhost:8100/noaserver';
  } else {
    url = 'https://disasterhub.space.noa.gr';
  }

  return {
    url: url,
    ingest: {
      geotag: url + paths.ingest + '/geotag',
      info: url + paths.ingest + '/info',
      photo: url + paths.ingest + '/photo'
    },
    user: {
      deregister: url + paths.user + '/deregister',
      login: url + paths.user + '/login',
      register: url + paths.user + '/register',
      verify: url + paths.user + '/verify'
    }
  }
})());
