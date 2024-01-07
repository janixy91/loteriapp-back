var express = require("express");
var router = express.Router();
var request = require("request-promise-native");
var OneSignal = require("onesignal-node");
var firebase = require("firebase");
var YEARNAVIDAD = 2023;
var YEARNINO = YEARNAVIDAD + 1;

var myClient = new OneSignal.Client({
  userAuthKey: "ZGY4YTk1M2QtN2E0ZC00ZGM1LThmNmUtN2Q2NGQ4N2E2MTY1",
  app: {
    appAuthKey: "OWM2ODJhYmEtZjkzMy00ZTMzLWI3NmYtM2E4YTg1MzE1MDdi",
    appId: "d8fc7736-f222-42f4-bd4e-460c1cbab6ba",
  },
});

firebase.initializeApp({
  apiKey: "AIzaSyBKke5dMiIetgSyKXkz7dPIKMGTNUi2WFY",
  authDomain: "loteriapp-9169e.firebaseapp.com",
  databaseURL: "https://loteriapp-9169e.firebaseio.com",
  projectId: "loteriapp-9169e",
});

checkPremios = async function (type) {
  const response = await getPremios(type);
  if (response.status !== 0) {
    if (type === "navidad") {
      _checkNavidad(response, type);
    } else {
      _checkNino(response, type);
    }
  }
};

const _checkNavidad = async (response, type) => {
  // antiguo cuando el pais

  // delete response.status;
  // delete response.timestamp;
  // delete response.fraseSorteoPDF;
  // delete response.fraseListaPDF;
  // delete response.listaPDF;
  // delete response.urlAudio;
  // delete response.error;

  const listaPremios = response.bet;
  let number;
  for (let numberIndex in listaPremios) {
    let numeroDePremio = numberIndex.replace("P", "");
    if (numeroDePremio === "4" || numeroDePremio === "5") {
      const startOn = numeroDePremio === "4" ? 4 : 6;
      let count = 0;

      for (let premio of listaPremios[numberIndex]) {
        if (premio) {
          number = pad(premio, 5);
          await checkCreateAndPush(
            "numero" + (parseInt(startOn) + count),
            number,
            type
          );
          count++;
        }
      }
    } else {
      if (listaPremios[numberIndex]) {
        number = pad(listaPremios[numberIndex], 5);
        await checkCreateAndPush("numero" + numeroDePremio, number, type);
      }
    }

    // antiguo cuando el pais
    // if (numberIndex === "numero" + count) {
    //   if (response[numberIndex] !== "-1" && response[numberIndex] !== -1) {
    //     const number = pad(response[numberIndex], 5);
    //     await checkCreateAndPush(numberIndex, number, type);
    //   }
    // }
  }
};

const _checkNino = async (response, type) => {
  // el 1, 2 y 3
  const listaPremios = response.bet;
  let number;
  for (let numberIndex in listaPremios) {
    let numeroDePremio = numberIndex.replace("P", "");
    if (listaPremios[numberIndex]) {
      number = pad(listaPremios[numberIndex], 5);
      await checkCreateAndPush("premio" + numeroDePremio, number, type);
    }
  }

  const extracciones = response.other.extractions;
  for (let numberIndex in extracciones) {
    let numeroDePremio = numberIndex.replace("T", "");
    let count = 0;
    for (let premio of extracciones[numberIndex]) {
      if (premio) {
        await checkCreateAndPush(
          "extracciones" + numeroDePremio + "cifras" + (count + 1),
          premio,
          type
        );
        count++;
      }
    }
  }

  const reintegros = response.other.num_refund;
  let count = 0;

  for (let premio of reintegros) {
    if (premio) {
      await checkCreateAndPush("reintegros" + (count + 1), premio, type);
      count++;
    }
  }
};

// const _checkNino = async (response, type) => {
//   if (response.premio1 !== "-1" && response.premio1 !== -1) {
//     await checkCreateAndPush("premio1", pad(response["premio1"], 5), type);
//   }
//   if (response.premio2 !== "-1" && response.premio2 !== -1) {
//     await checkCreateAndPush("premio2", pad(response["premio2"], 5), type);
//   }
//   if (response.premio3 !== "-1" && response.premio3 !== -1) {
//     await checkCreateAndPush("premio3", pad(response["premio3"], 5), type);
//   }

//   if (
//     response.extracciones3cifras[0] !== "-1" &&
//     response.extracciones3cifras[0] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras1",
//       response["extracciones3cifras"][0],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[1] !== "-1" &&
//     response.extracciones3cifras[1] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras2",
//       response["extracciones3cifras"][1],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[2] !== "-1" &&
//     response.extracciones3cifras[2] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras3",
//       response["extracciones3cifras"][2],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[3] !== "-1" &&
//     response.extracciones3cifras[3] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras4",
//       response["extracciones3cifras"][3],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[4] !== "-1" &&
//     response.extracciones3cifras[4] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras5",
//       response["extracciones3cifras"][4],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[5] !== "-1" &&
//     response.extracciones3cifras[5] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras6",
//       response["extracciones3cifras"][5],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[6] !== "-1" &&
//     response.extracciones3cifras[6] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras7",
//       response["extracciones3cifras"][6],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[7] !== "-1" &&
//     response.extracciones3cifras[7] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras8",
//       response["extracciones3cifras"][7],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[8] !== "-1" &&
//     response.extracciones3cifras[8] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras9",
//       response["extracciones3cifras"][8],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[9] !== "-1" &&
//     response.extracciones3cifras[9] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras10",
//       response["extracciones3cifras"][9],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[10] !== "-1" &&
//     response.extracciones3cifras[10] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras11",
//       response["extracciones3cifras"][10],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[11] !== "-1" &&
//     response.extracciones3cifras[11] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras12",
//       response["extracciones3cifras"][11],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[12] !== "-1" &&
//     response.extracciones3cifras[12] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras13",
//       response["extracciones3cifras"][12],
//       type
//     );
//   }
//   if (
//     response.extracciones3cifras[13] !== "-1" &&
//     response.extracciones3cifras[13] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones3cifras14",
//       response["extracciones3cifras"][13],
//       type
//     );
//   }

//   if (
//     response.extracciones2cifras[0] !== "-1" &&
//     response.extracciones2cifras[0] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones2cifras1",
//       response["extracciones2cifras"][0],
//       type
//     );
//   }
//   if (
//     response.extracciones2cifras[1] !== "-1" &&
//     response.extracciones2cifras[1] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones2cifras2",
//       response["extracciones2cifras"][1],
//       type
//     );
//   }
//   if (
//     response.extracciones2cifras[2] !== "-1" &&
//     response.extracciones2cifras[2] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones2cifras3",
//       response["extracciones2cifras"][2],
//       type
//     );
//   }
//   if (
//     response.extracciones2cifras[3] !== "-1" &&
//     response.extracciones2cifras[3] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones2cifras4",
//       response["extracciones2cifras"][3],
//       type
//     );
//   }
//   if (
//     response.extracciones2cifras[4] !== "-1" &&
//     response.extracciones2cifras[4] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones2cifras5",
//       response["extracciones2cifras"][4],
//       type
//     );
//   }

//   if (
//     response.extracciones4cifras[0] !== "-1" &&
//     response.extracciones4cifras[0] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones4cifras1",
//       response["extracciones4cifras"][0],
//       type
//     );
//   }
//   if (
//     response.extracciones4cifras[1] !== "-1" &&
//     response.extracciones4cifras[1] !== -1
//   ) {
//     await checkCreateAndPush(
//       "extracciones4cifras2",
//       response["extracciones4cifras"][1],
//       type
//     );
//   }

//   if (response.reintegros[0] !== "-1" && response.reintegros[0] !== -1) {
//     await checkCreateAndPush("reintegros1", response["reintegros"][0], type);
//   }
//   if (response.reintegros[1] !== "-1" && response.reintegros[1] !== -1) {
//     await checkCreateAndPush("reintegros2", response["reintegros"][1], type);
//   }
//   if (response.reintegros[2] !== "-1" && response.reintegros[2] !== -1) {
//     await checkCreateAndPush("reintegros3", response["reintegros"][2], type);
//   }
// };

const _sendPush = (numberIndex, number, type) => {
  return new Promise((resolve) => {
    var firstNotification = new OneSignal.Notification({
      contents: {
        en: _getMessage(numberIndex, number),
      },
      headings: {
        en:
          type === "navidad"
            ? "¡HA SALIDO UN PREMIO DE LOTERIA DE NAVIDAD!"
            : "¡HA SALIDO UN PREMIO DE LA LOTERIA DEL NIÑO!",
      },
    });
    if (process.env.environment === "pro") {
      console.log("por pro");
      firstNotification.postBody["included_segments"] = [
        "Active Users",
        "Inactive Users",
      ];
    } else {
      console.log("por dev");
      firstNotification.postBody["include_player_ids"] = [
        "8e9fac71-5adf-41a6-985a-4444903b415f",
      ];
    }

    myClient.sendNotification(
      firstNotification,
      function (err, httpResponse, data) {
        if (err) {
          console.log(err);
        }
        resolve();
      }
    );
  });
};

const _createNumberInDataBase = (numberIndex, number, type) => {
  const environment = process.env.environment === "pro" ? "" : "-dev";
  console.log(environment);
  console.log(`/${type}${environment}/${numberIndex}`);
  firebase.database().ref(`/${type}${environment}/${numberIndex}`).set({
    number: number,
  });
};

// pone el numero de 5 cifras
function pad(n, width, z) {
  z = z || "0";
  n = n + "";
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

const _getMessage = (numberIndex, number) => {
  if (numberIndex === "numero1") {
    return `¡EL GORDO! Número:  ${number}`;
  } else if (numberIndex === "numero2") {
    return `El SEGUNDO premio, número: ${number}`;
  } else if (numberIndex === "numero3") {
    return `El TERCER premio, número:  ${number}`;
  } else if (numberIndex === "numero4") {
    return `El primer CUARTO premio, número: ${number}`;
  } else if (numberIndex === "numero5") {
    return `El segundo CUARTO premio, número: ${number}`;
  } else if (numberIndex === "numero6") {
    return `El primer QUINTO premio, número: ${number}`;
  } else if (numberIndex === "numero7") {
    return `El segundo QUINTO premio, número: ${number}`;
  } else if (numberIndex === "numero8") {
    return `El tercer QUINTO premio, número: ${number}`;
  } else if (numberIndex === "numero9") {
    return `El cuarto QUINTO premio, número: ${number}`;
  } else if (numberIndex === "numero10") {
    return `El quinto QUINTO premio, número: ${number}`;
  } else if (numberIndex === "numero11") {
    return `El sexto QUINTO premio, número: ${number}`;
  } else if (numberIndex === "numero12") {
    return `El septimo QUINTO premio, número: ${number}`;
  } else if (numberIndex === "numero13") {
    return `El octavo QUINTO premio, número: ${number}`;
  } else if (numberIndex === "premio1") {
    return `¡El PRIMER premio!, Número: ${number}`;
  } else if (numberIndex === "premio2") {
    return `El SEGUNDO premio, número: ${number}`;
  } else if (numberIndex === "premio3") {
    return `El TERCER premio, número: ${number}`;
  } else if (numberIndex.includes("reintegros")) {
    return `Un reintegro: ${number}`;
  }
};

const getPremios = (type) => {
  var options = {
    method: "post",
    json: true,
    form: {
      date: type === "navidad" ? `${YEARNAVIDAD}-12-22` : `${YEARNINO}-01-06`,
      id_draw: type === "navidad" ? `2023102` : "2024002",
      "id-game": type === "navidad" ? 7 : 7,
    },
    url: "https://www.buscarloteria.com/ajax/getGameResult",
  };

  return new Promise((resolve) => {
    request(options).then((responseText) => {
      resolve(responseText);
    });
  });
};

const checkCreateAndPush = (index, number, type) => {
  const environment = process.env.environment === "pro" ? "" : "-dev";
  return new Promise((resolve) => {
    firebase
      .database()
      .ref(`/${type}${environment}/${index}`)
      .once("value")
      .then(async function (snapshot) {
        if (snapshot.val() === null) {
          _createNumberInDataBase(index, number, type);
          if (
            !index.includes("extracciones2cifra") &&
            !index.includes("extracciones3cifra") &&
            !index.includes("extracciones4cifra")
          ) {
            console.log("a push", index);
            await _sendPush(index, number, type);
          }
        }
        resolve();
      });
  });
};

module.exports = checkPremios;
