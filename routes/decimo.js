var express = require('express');
var router = express.Router();
var request = require('request-promise-native');

/* GET users listing. */
router.get('/', function (req, res, next) {
  var options = {
    method: 'get',
    json: true,
    url: req.query.type === 'nino' ? `http://api.elpais.com/ws/LoteriaNinoPremiados?n=${req.query.code}` : `http://api.elpais.com/ws/LoteriaNavidadPremiados?n=${req.query.code}`,
  }
  request(options).then((responseText) => {
    let data;
    const response = JSON.parse(responseText.replace('busqueda=', ''))
    const isYear = new Date(response.timestamp).getFullYear() === 2019 || new Date(1545498714 * 1000).getFullYear() === 2020;
    const status = getStatus(response.status, isYear, response.premio);

    if (response.error === 0) {
      if (req.query.type === 'navidad' && new Date() > new Date("2019/12/22")) {
        data = getData(response, status, isYear);
      } else if (req.query.type === 'nino' && new Date() > new Date("2020/01/6")) {
        data = getData(response, status, isYear);
      } else {
        data = {
          error: 0,
          amount: 0,
          status: 'pending',
          message: {
            text: 'El sorteo no ha empezado',
            title: '¡Una cosa!'
          }
        }
      }
    }
    res.json(data);
  }).catch((error) => {
    res.json(error);
  })
});

const getData = (response, status, isYear) => {
  return {
    error: 0,
    amount: response.premio,
    status: status,
    message: getMessage(status, isYear, response.premio, response.status)
  }

}

const getStatus = (resStatus, isYear, premio) => {
  let status;

  if (!isYear || resStatus === 0) {
    status = 'pending'
  } else if (premio > 0) {
    status = 'win'
  } else if (premio === 0) {
    status = 'lost'
  } else {
    status = 'pending'
  }

  return status;
}

const getMessage = (status, isYear, premio, responseStatus) => {
  let message;

  if (status === 'pending') {
    message = {
      text: 'El sorteo no ha empezado',
      title: '¡Una cosa!'
    }
  } else if (status === 'win') {
    if (responseStatus !== 4) {
      message = {
        text: `¡Es posible que hayas GANADO ${premio}€ !, pero los datos aún no son definitivos`,
        title: '¡Posible Premio!'
      }
    } else {
      message = {
        text: `¡ Segun los datos proporcionados por elpais.com has GANADO ${premio}€ !`,
        title: '¡Premio!'
      }
    }
  } else if (status === 'lost') {
    if (responseStatus !== 4) {
      message = {
        text: `Es posible que este decimo no haya sido premiado, pero los datos aún no son definitivos`,
        title: 'Lo sentimos'
      }
    } else {
      message = {
        text: `Segun los datos proporcionados por elpais.com el decimo no ha sido premiado.`,
        title: 'Lo sentimos'
      }
    }
  }

  return message;
}

module.exports = router;
