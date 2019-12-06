var express = require('express');
var router = express.Router();
var request = require('request-promise-native');

/* GET users listing. */
router.get('/', function (req, res, next) {
  var options = {
    method: 'get',
    json: true,
    url: `http://api.elpais.com/ws/LoteriaNavidadPremiados?n=${req.query.code}`,
  }
  request(options).then((responseText) => {
    let data;
    const response = JSON.parse(responseText.replace('busqueda=', ''))
    if (response.error === 0) {
      data = {
        error: 0,
        win: response.premio > 0,
        amount: response.premio,
        isYear: new Date(1545498714 * 1000).getFullYear() === new Date().getFullYear(),
        status: response.status
      }
    }
    res.json(data);
  }).catch((error) => {
    res.json(error);
  })
});

module.exports = router;
