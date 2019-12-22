var express = require('express');
var router = express.Router();
var firebase = require('firebase');

router.get('/', async function (req, res, next) {
  const environment = process.env.environment === 'pro' ? '' : '-dev'

  firebase.database().ref(`/${req.query.type}${environment}`).once('value').then(async function (snapshot) {
    res.json(snapshot.val());
  });
});


module.exports = router;

