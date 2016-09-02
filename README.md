# DisasterHub

<h3>Install Ionic framework and Cordova project command-line tools</h3>

First, install <a href="http://nodejs.org/">Node.js</a>. Then install the command-line tools:

<pre>$ npm install -g cordova ionic</pre>

Follow the <a href="http://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html">Android</a> and <a href="http://cordova.apache.org/docs/en/5.1.1/guide/platforms/ios/index.html">iOS</a> platform guides to install required platform dependencies.

<i>
<strong>Note: </strong> Currently olny the Android platform is supported.
</i>

<h3>Install bower package manager</h3>

<pre>$ npm install -g bower</pre>

<h3>Install DisaterHub in your local machine</h3>

Clone source code:

<pre>$ git clone https://github.com/vtsironis/DisasterHub.git</pre>

Change current directory to DisaterHub's root directory:

<pre>$ cd DisasterHub</pre>

Install dependencies:

<pre>$ bower install</pre>

<h3>Run DisasterHub in your PC</h3>

You can run DisasterHub in your PC using localhost and a Web browser:

<pre>$ ionic serve</pre>

Congratulations! DisasterHub should launch in the Web browser of your PC right now in the address <a href="http://localhost:8100/" target="_blank">http://localhost:8100/</a>!!!

<i>
<strong>Note 1: </strong> Please make sure that DisasterHub is running in port 8100 of localhost (i.e. http://localhost:8100/).
</i>

<i>
<strong>Note 2: </strong> DisasterHub is tested in Mozilla Firefox and Google Chrome, so better use one of these browsers.
</i>

<h3>Run DisasterHub in your mobile device</h3>

Restore DisasterHub plugins and platforms:

<pre>$ ionic state restore</pre>

<i>
<strong>Note: </strong> Currently olny the Android platform is supported.
</i>

After restoring the DisasterHub plugins and platforms you have two options.

<strong>Option 1</strong>

Build the app file in your PC and then use it to install DisasterHub in your mobile device.

Build DisasterHub in your PC:

<pre>$ ionic build</pre>

In the case of the Android platform an APK file named <i>android-armv7-debug.apk</i> will be created under the folder $PATH_TO_DISASTERHUB/DisasterHub/platforms/android/build/outputs/apk. You can use this file to install the DisasterHub app in your android device.

<strong>Option 2</strong>

Build, install and run DisasterHub directly in your mobile device. However, in order to do that you must first enable USB debugging in your mobile device (<a href="https://developer.android.com/studio/run/device.html">view more information</a>) and then connect it to your PC via usb.

Run DisasterHub in your mobile device:

<pre>$ ionic run</pre>

Congratulations! DisasterHub should launch in your mobile device right now!!!
