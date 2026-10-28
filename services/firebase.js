"use strict";

var firebase = require("firebase");

if (firebase.apps.length === 0) {
  firebase.initializeApp({
    apiKey:
      process.env.FIREBASE_API_KEY ||
      "AIzaSyBKke5dMiIetgSyKXkz7dPIKMGTNUi2WFY",
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN || "loteriapp-9169e.firebaseapp.com",
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      "https://loteriapp-9169e.firebaseio.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "loteriapp-9169e",
  });
}

module.exports = firebase;
