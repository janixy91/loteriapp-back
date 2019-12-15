var express = require('express');
var router = express.Router();
var request = require('request-promise-native');
var YEARNAVIDAD = 2019;
var YEARNINO = YEARNAVIDAD + 1;

router.get('/', async function (req, res, next) {
  let data;
  if (inTime(req.query.type)) {
    const response = await checkOne(req.query.code, req.query.type);
    const status = getStatus(response.status, response.premio, response.timestamp);
    data = getData(response, status, req.query.amount);
  } else {
    data = getDataPending()
  }
  res.json(data);
});

router.post('/', async function (req, res, next) {
  const decimos = req.body.data;

  if (inTime(req.query.type)) {
    let total = 0;
    let status;
    let statusElPais;
    for (let decimo of decimos) {
      const response = await checkOne(decimo.number, req.query.type);
      statusElPais = response.status;
      status = getStatus(statusElPais, response.premio, response.timestamp);
      const premio = getQuantityByAmount(decimo.amount, response.premio);
      if (status === 'pending') {
        break;
      } else if (status === 'win') {
        total += premio;
      }
      decimo.status = status;
      decimo.statusElPais = statusElPais;
      decimo.quantity = premio;
    }
    if (status !== 'pending') {
      status = total > 0 ? 'win' : 'lost';
    }
    const message = getMessage(status, total, statusElPais)
    data = {
      error: 0,
      quantity: total,
      message: message,
      decimos: decimos
    }
  } else {
    data = getDataPending()
  }

  res.json(data);

});

const inTime = (type) => {
  return ((type === 'navidad' && new Date() > new Date(`${YEARNAVIDAD}/12/22`)) || (type === 'nino' && new Date() > new Date(`${YEARNINO}/01/6`)))
}

const checkOne = (number, type) => {
  var options = {
    method: 'get',
    json: true,
    url: type === 'nino' ? `http://api.elpais.com/ws/LoteriaNinoPremiados?n=${parseInt(number)}` : `http://api.elpais.com/ws/LoteriaNavidadPremiados?n=${parseInt(number)}`,
  }

  return new Promise(resolve => {
    request(options).then((responseText) => {
      resolve(JSON.parse(responseText.replace('busqueda=', '')))
    })
  })
}

const getData = (response, status, amount) => {
  const premio = getQuantityByAmount(amount, response.premio);
  return {
    error: 0,
    quantity: premio,
    status: status,
    message: getMessage(status, premio, response.status)
  }
}

const getDataPending = () => {
  return {
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

const getQuantityByAmount = (amount, premio) => {
  return premio / 20 * amount;
}

const getStatus = (resStatus, premio, timestamp) => {
  let isYear = new Date(timestamp * 1000).getFullYear() === YEARNAVIDAD || new Date(timestamp * 1000).getFullYear() === YEARNINO;
  // isYear = true;
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

const getMessage = (status, premio, responseStatus) => {
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
        text: `Es posible que no hayas sido premiado, pero los datos aún no son definitivos`,
        title: 'Lo sentimos'
      }
    } else {
      message = {
        text: `Segun los datos proporcionados por ELPAIS no has sido premiado.`,
        title: 'Lo sentimos'
      }
    }
  }

  return message;
}

module.exports = router;

