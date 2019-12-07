var express = require('express');
var router = express.Router();
var request = require('request-promise-native');

/* GET users listing. */
router.get('/', async function (req, res, next) {

  if (inTime(req.query.type)) {

    const response = await checkOne(options, req.query.type);
    const isYear = new Date(response.timestamp).getFullYear() === 2019 || new Date(1545498714 * 1000).getFullYear() === 2020;
    const status = getStatus(response.status, isYear, response.premio);
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
  res.json(data);
});

router.post('/', async function (req, res, next) {
  const decimos = req.body.data;
  if (inTime(req.query.type)) {
    let total = 0;
    let statusElPais;
    let isYear;
    for (let decimo of decimos) {
      const response = await checkOne(decimo.number, req.query.type);
      statusElPais = response.status
      isYear = new Date(response.timestamp).getFullYear() === 2019 || new Date(1545498714 * 1000).getFullYear() === 2020;
      const status = getStatus(response.status, isYear, response.premio);
      if (status === 'win') {
        total += response.premio;
      }
      decimo.status = status;
      decimo.quantity = response.premio;
    }
    let message;
    if (!isYear || statusElPais === 0) {
      message = {
        text: 'El sorteo no ha empezado',
        title: '¡Una cosa!'
      }
    } else
      if (total > 0 && statusElPais !== 4) {
        message = {
          text: `¡Es posible que hayas GANADO ${total}€!, pero los datos aún no son definitivos`,
          title: '¡Posible Premio!'
        }
      } else if (total > 0 && statusElPais === 4) {
        message = {
          text: `¡Según los datos proporcionados por EL PAIS has GANADO ${total}€!`,
          title: '¡Premio!'
        }
      } else if (total === 0 && statusElPais !== 4) {
        message = {
          text: `Es posible que no hayas sido premiado, pero los datos aún no son definitivos`,
          title: 'Lo sentimos'
        }
      } else if (total === 0 && statusElPais === 4) {
        message = {
          text: `Segun los datos proporcionados por EL PAIS tus décimos no han sido premiados`,
          title: 'Lo sentimos'
        }
      }
    data = {
      error: 0,
      quantity: total,
      message: message,
      decimos: decimos
    }
  } else {
    data = {
      error: 0,
      quantity: 0,
      status: 'pending',
      message: {
        text: 'El sorteo no ha empezado',
        title: '¡Una cosa!'
      },
      decimos: []

    }
  }

  res.json(data);

});

const inTime = (type) => {
  return ((type === 'navidad' && new Date() > new Date("2019/12/22")) || (type === 'nino' && new Date() > new Date("2020/01/6")))
}

const checkOne = (number, type) => {
  var options = {
    method: 'get',
    json: true,
    url: type === 'nino' ? `http://api.elpais.com/ws/LoteriaNinoPremiados?n=${number}` : `http://api.elpais.com/ws/LoteriaNavidadPremiados?n=${number}`,
  }

  return new Promise(resolve => {
    request(options).then((responseText) => {
      resolve(JSON.parse(responseText.replace('busqueda=', '')))
    })
  })
}

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

  if (!isYear && resStatus === 0) {
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
        text: `¡Es posible que hayas GANADO ${premio}€!, pero los datos aún no son definitivos`,
        title: '¡Posible Premio!'
      }
    } else {
      message = {
        text: `¡ Segun los datos proporcionados por ELPAIS has GANADO ${premio}€!`,
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
        text: `Segun los datos proporcionados por ELPAIS el decimo no ha sido premiado.`,
        title: 'Lo sentimos'
      }
    }
  }

  return message;
}

module.exports = router;

