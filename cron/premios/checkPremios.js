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
      console.log(response[numberIndex])
      if (response[numberIndex] !== "-1" && response[numberIndex] !== -1) {
        const number = pad(response[numberIndex], 5)
        await checkCreateAndPush(numberIndex, number, type);
      }
    }
  }
}

const _checkNino = async (response, type) => {
  if (response.premio1 !== "-1" && response.premio1 !== -1) {
    await checkCreateAndPush('premio1', pad(response['premio1'], 5), type);
  }
  if (response.premio2 !== "-1" && response.premio2 !== -1) {
    await checkCreateAndPush('premio2', pad(response['premio2'], 5), type);
  }
  if (response.premio3 !== "-1" && response.premio3 !== -1) {
    await checkCreateAndPush('premio3', pad(response['premio3'], 5), type);
  }
  if (response.extracciones4cifras !== "-1" && response.extracciones4cifras !== -1) {

    console.log("por aki vengo")
    await checkCreateAndPush('extracciones4cifras', response['extracciones4cifras'].join(", "), type);
  }
  if (response.extracciones3cifras !== "-1" && response.extracciones3cifras !== -1) {
    await checkCreateAndPush('extracciones3cifras', response['extracciones3cifras'].join(", "), type);
  }
  if (response.extracciones2cifras !== "-1" && response.extracciones2cifras !== -1) {
    await checkCreateAndPush('extracciones2cifras', response['extracciones2cifras'].join(", "), type);
  }
  if (response.reintegros !== "-1" && response.reintegros !== -1) {
    await checkCreateAndPush('reintegros', response['reintegros'].join(", "), type);
  }
}

const _sendPush = (numberIndex, number, type) => {
  return new Promise(resolve => {
    var firstNotification = new OneSignal.Notification({
      contents: {
        en: _getMessage(numberIndex, number)
      },
      headings: {
        en: type === 'navidad' ? "¡HA SALIDO UN PREMIO DE LOTERIA DE NAVIDAD!" : "¡HA SALIDO UN PREMIO DE LA LOTERIA DEL NIÑO!"
      }
    });

    if (process.env.environment === 'pro') {
      console.log("por pro")
      firstNotification.postBody["included_segments"] = ["Active Users", "Inactive Users"];
    } else {
      console.log("por dev")
      firstNotification.postBody["include_player_ids"] = ["8e9fac71-5adf-41a6-985a-4444903b415f"];
    }

    myClient.sendNotification(firstNotification, function (err, httpResponse, data) {
      if (err) {
        console.log(err)
      }
      resolve();
    });
  });
}

const _createNumberInDataBase = (numberIndex, number, type) => {
  const environment = process.env.environment === 'pro' ? '' : '-dev'
  console.log(environment)
  console.log(`/${type}${environment}/${numberIndex}`)
  firebase.database().ref(`/${type}${environment}/${numberIndex}`).set({
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
    return `¡EL GORDO! Número:  ${number}`
  } else if (numberIndex === "numero2") {
    return `El SEGUNDO premio, número: ${number}`
  } else if (numberIndex === "numero3") {
    return `El TERCER premio, número:  ${number}`
  } else if (numberIndex === "numero4") {
    return `El primer CUARTO premio, número: ${number}`
  } else if (numberIndex === "numero5") {
    return `El segundo CUARTO premio, número: ${number}`
  } else if (numberIndex === "numero6") {
    return `El primer QUINTO premio, número: ${number}`
  } else if (numberIndex === "numero7") {
    return `El segundo QUINTO premio, número: ${number}`
  } else if (numberIndex === "numero8") {
    return `El tercer QUINTO premio, número: ${number}`
  } else if (numberIndex === "numero9") {
    return `El cuarto QUINTO premio, número: ${number}`
  } else if (numberIndex === "numero10") {
    return `El quinto QUINTO premio, número: ${number}`
  } else if (numberIndex === "numero11") {
    return `El sexto QUINTO premio, número: ${number}`
  } else if (numberIndex === "numero12") {
    return `El septimo QUINTO premio, número: ${number}`
  } else if (numberIndex === "numero13") {
    return `El octavo QUINTO premio, número: ${number}`
  } else if (numberIndex === "premio1") {
    return `¡El PRIMER premio!, Número: ${number}`
  } else if (numberIndex === "premio2") {
    return `El SEGUNDO premio, número: ${number}`
  } else if (numberIndex === "premio3") {
    return `El TERCER premio, número: ${number}`
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
  const environment = process.env.environment === 'pro' ? '' : '-dev'
  console.log(index, "nidex")
  return new Promise(resolve => {
    firebase.database().ref(`/${type}${environment}/${index}`).once('value').then(async function (snapshot) {
      console.log(snapshot.val(), "snapshot.val()")
      console.log(number, number)

      if (snapshot.val() === null) {
        _createNumberInDataBase(index, number, type);
        if (index !== 'reintegros' && index !== 'extracciones2cifras' && index !== 'extracciones3cifras' && index !== 'extracciones4cifras') {
          console.log("a push")
          await _sendPush(index, number, type);
        }
      }
      resolve();
    });
  })
}

module.exports = checkPremios;