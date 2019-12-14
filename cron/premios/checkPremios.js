var express = require('express');
var router = express.Router();
var request = require('request-promise-native');
var OneSignal = require('onesignal-node');
var firebase = require('firebase');

var myClient = new OneSignal.Client({
  userAuthKey: 'ZGY4YTk1M2QtN2E0ZC00ZGM1LThmNmUtN2Q2NGQ4N2E2MTY1',
  app: { appAuthKey: 'OWM2ODJhYmEtZjkzMy00ZTMzLWI3NmYtM2E4YTg1MzE1MDdi', appId: 'd8fc7736-f222-42f4-bd4e-460c1cbab6ba' }
});

firebase.initializeApp({
  apiKey: 'AIzaSyBKke5dMiIetgSyKXkz7dPIKMGTNUi2WFY',
  authDomain: 'loteriapp-9169e.firebaseapp.com',
  databaseURL: 'https://loteriapp-9169e.firebaseio.com',
  projectId: 'loteriapp-9169e',
});

checkPremios = async function (type) {
  const response = await getPremios(type);
  if (response.status !== 0) {
    if (type === 'navidad') {
      _checkNavidad(response, type);
    } else {
      _checkNino(response, type);
    }
  }
};

const _checkNavidad = async (response, type) => {
  delete response.status;
  delete response.timestamp;
  delete response.fraseSorteoPDF;
  delete response.fraseListaPDF;
  delete response.listaPDF;
  delete response.urlAudio;
  delete response.error;
  let count = 0
  for (let numberIndex in response) {
    count++;
    if (numberIndex === 'numero' + count) {
      const number = pad(response[numberIndex], 5)
      if (number !== "-1" && number !== -1) {
        console.log("numberIndex", numberIndex)
        await checkCreateAndPush(numberIndex, number, type);
      }
    }
  }
}

const _checkNino = async (response) => {
  console.log(response.premio1)
  if (response.premio1 !== "-1" && response.premio1 !== -1) {
    await checkCreateAndPush('premio1', pad(response['premio1'], 5), type);
  }
  if (response.premio2 !== "-1" && response.premio2 !== -1) {
    await checkCreateAndPush('premio2', pad(response['premio2'], 5), type);
  }
  if (response.premio3 !== "-1" && response.premio3 !== -1) {
    await checkCreateAndPush('premio3', pad(response['premio3'], 5), type);
  }
  if (response.extracciones4 !== "-1" && response.extracciones4 !== -1) {
    await checkCreateAndPush('extracciones4', pad(response['extracciones4'], 5), type);
  }
  if (response.extracciones3 !== "-1" && response.extracciones3 !== -1) {
    await checkCreateAndPush('extracciones3', pad(response['extracciones3'], 5), type);
  }
  if (response.extraciones2 !== "-1" && response.extraciones2 !== -1) {
    await checkCreateAndPush('extraciones2', pad(response['extraciones2'], 5), type);
  }
  if (response.reintegros !== "-1" && response.reintegros !== -1) {
    await checkCreateAndPush('reintegros', pad(response['reintegros'], 5), type);
  }
}

const _sendPush = (numberIndex, number) => {
  return new Promise(resolve => {
    var firstNotification = new OneSignal.Notification({
      contents: {
        en: _getMessage(numberIndex, number)
      },
      headings: {
        en: "ALERTA LOTERIA DE NAVIDAD"
      }
    });
    firstNotification.postBody["included_segments"] = ["Active Users", "Inactive Users"];

    myClient.sendNotification(firstNotification, function (err, httpResponse, data) {
      if (err) {
        console.log(err)
      }
      resolve();
    });
  });
}

const _createNumberInDataBase = (numberIndex, number, type) => {
  firebase.database().ref(`/${type}/${numberIndex}`).set({
    number: number,
  });
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}


const _getMessage = (numberIndex, number) => {
  if (numberIndex === "numero1") {
    return `¡Ha salido el GORDO!:  ${number}`
  } else if (numberIndex === "numero2") {
    return `Ha salido el SEGUNDO premio:  ${number}`
  } else if (numberIndex === "numero3") {
    return `Ha salido el TERCER premio:  ${number}`
  } else if (numberIndex === "numero4") {
    return `Ha salido el primer CUARTO premio: ${number}`
  } else if (numberIndex === "numero5") {
    return `Ha salido el segundo CUARTO premio:  ${number}`
  } else if (numberIndex === "numero6") {
    return `Ha salido el primer QUINTO premio:  ${number}`
  } else if (numberIndex === "numero7") {
    return `Ha salido el segundo QUINTO premio:  ${number}`
  } else if (numberIndex === "numero8") {
    return `Ha salido el tercer QUINTO premio:  ${number}`
  } else if (numberIndex === "numero9") {
    return `Ha salido el cuarto QUINTO premio:  ${number}`
  } else if (numberIndex === "numero10") {
    return `Ha salido el quinto QUINTO premio:  ${number}`
  } else if (numberIndex === "numero11") {
    return `Ha salido el sexto QUINTO premio:  ${number}`
  } else if (numberIndex === "numero12") {
    return `Ha salido el septimo QUINTO premio:  ${number}`
  } else if (numberIndex === "numero13") {
    return `Ha salido el octavo QUINTO premio:  ${number}`
  }
}

const getPremios = (type) => {
  var options = {
    method: 'get',
    json: true,
    url: type === 'nino' ? `http://api.elpais.com/ws/LoteriaNinoPremiados?n=resumen` : `http://api.elpais.com/ws/LoteriaNavidadPremiados?n=resumen`,
  }

  return new Promise(resolve => {
    request(options).then((responseText) => {
      resolve(JSON.parse(responseText.replace('premios=', '')))
    })
  })
}

const checkCreateAndPush = (index, number, type) => {
  return new Promise(resolve => {
    firebase.database().ref(`/${type}/${index}`).once('value').then(async function (snapshot) {
      if (snapshot.val() === null) {
        _createNumberInDataBase(index, number, type);
        await _sendPush(index, number);
      }

      resolve();
    });
  })
}

module.exports = checkPremios;