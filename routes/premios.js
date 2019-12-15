var express = require('express');
var router = express.Router();
var firebase = require('firebase');

router.get('/', async function (req, res, next) {
  firebase.database().ref(`/${req.query.type}`).once('value').then(async function (snapshot) {
    res.json(snapshot.val());
  });
});


module.exports = router;

