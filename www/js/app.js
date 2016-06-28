// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('dHb', ['ionic',
                       'dHb.constants',
                       'dHb.controllers',
                       'dHb.filters',
                       'dHb.services',
                       'ion-floating-menu',
                       'ionic-native-transitions',
                       'monospaced.elastic',
                       'auth0',
                       'angular-storage',
                       'angular-jwt',
                       'ngCordova'])

.config(function($ionicConfigProvider) {
  // Position tabs to bottom.
  $ionicConfigProvider.tabs.position('bottom');
  // User iOS style for tabs.
  $ionicConfigProvider.tabs.style('standard');
})

.config(function($stateProvider, $urlRouterProvider, authProvider, jwtInterceptorProvider, $httpProvider) {
  
  $stateProvider
  
  .state('user', {
    abstract: true,
    templateUrl: 'templates/user.html',
    url: '/user'
  })

  .state('user.login', {
    cache: false,
    url: '/login',
    views: {
      'user-login': {
        controller: 'LoginCtrl',
        templateUrl: 'templates/user-login.html',
      }
    }
  })

  .state('user.logout', {
    cache: false,
    url: '/logout',
    views: {
      'user-logout': {
        controller: 'LogoutCtrl',
        templateUrl: 'templates/user-logout.html'
      }
    }
  })

  .state('user.register', {
    cache: false,
    url: '/register',
    views: {
      'user-register': {
        controller: 'LoginCtrl',
        templateUrl: 'templates/user-register.html'
      }
    }
  })

  $stateProvider
  .state('app', {
    abstract: true,
    controller: 'AppCtrl',
    data: {
      requiresLogin: true
    },
    templateUrl: 'templates/menu.html',
    url: '/app'
  })

  .state('app.about', {
    url: '/about',
    views: {
      'menuContent': {
        templateUrl: 'templates/about.html',
        controller: 'AboutCtrl'
      }
    }
  })

  .state('app.events', {
    //cache: false,
    url: '/events/:alert/:hazard',
    views: {
      'menuContent': {
        templateUrl: 'templates/events.html',
        controller: 'EventsCtrl'
      }
    }
  })
  
  .state('app.event', {
    cache: false,
    url: '/event/:eventId',
    views: {
      'menuContent': {
        templateUrl: 'templates/event.html',
        controller: 'EventCtrl'
      }
    }
  })

  .state('app.geotag', {
    cache: false,
    url: '/geotag',
    views: {
      'menuContent': {
        templateUrl: 'templates/geotag.html',
        controller: 'GeotagCtrl'
      }
    }
  })

  .state('app.post', {
    cache: false,
    url: '/post/:hazardId',
    views: {
      'menuContent': {
        templateUrl: 'templates/post.html',
        controller: 'PostCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/events/all/all');

  // Configure Auth0
  authProvider.init({
    domain: AUTH0_DOMAIN,
    clientID: AUTH0_CLIENT_ID,
    loginState: 'user.login'
  });

  jwtInterceptorProvider.tokenGetter = function(store, jwtHelper, auth) {
    var idToken = store.get('token');
    var refreshToken = store.get('refreshToken');
    
    if (!idToken || !refreshToken) {
      return null;
    }
    
    if (jwtHelper.isTokenExpired(idToken)) {
      
      return auth.refreshIdToken(refreshToken).then(function(idToken) {
        store.set('token', idToken);
        return idToken;
      }, function(error) {
        store.remove('refreshToken');
      });
    } else {
      return idToken;
    }
  }
  

  $httpProvider.interceptors.push('jwtInterceptor');
})

.run(function($ionicPlatform, $rootScope, auth, store, jwtHelper, $location) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

    // Register EPSG:2100 projection.
    proj4.defs(

      'EPSG:2100',

      '+proj=tmerc +lat_0=0 +lon_0=24 +k=0.9996 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=-199.87,74.79,246.62,0,0,0,0 +units=m +no_defs'

    );
  });

  //This hooks all auth avents
  auth.hookEvents();
  //This event gets triggered on URL change
  var refreshingToken = null;
  $rootScope.$on('$locationChangeStart', function() {
    var token = store.get('token');
    var refreshToken = store.get('refreshToken');
    if (token) {
      if (!jwtHelper.isTokenExpired(token)) {
        if (!auth.isAuthenticated) {
          auth.authenticate(store.get('profile'), token);
        }
      } else {
        if (refreshToken) {
          if (refreshingToken === null) {
            refreshingToken = auth.refreshIdToken(refreshToken).then(function(idToken) {
              store.set('token', idToken);
              auth.authenticate(store.get('profile'), idToken);
            }, function(error) {
              store.remove('refreshToken');
            }).finally(function() {
              refreshingToken = null;
            });
          }
          return refreshingToken;
        } else {
          $location.path('/user/login');// Notice: this url must be the one defined
        }                          // in your login state. Refer to step 5.
      }
    }
  });
})
