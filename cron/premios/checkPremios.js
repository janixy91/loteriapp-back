var OneSignal = require("onesignal-node");
var firebase = require("../../services/firebase");
var getLegacySummary = require("../../services/lottery/rtveProvider")
  .getLegacySummary;
var getDrawConfig = require("../../services/lottery/config").getDrawConfig;
var firebaseResults = require("../../services/lottery/firebaseResults");

var myClient = null;

const getOneSignalClient = () => {
  if (process.env.PUSH_NOTIFICATIONS_ENABLED !== "true") {
    return null;
  }
  if (myClient) {
    return myClient;
  }

  const userAuthKey = process.env.ONESIGNAL_USER_AUTH_KEY;
  const appAuthKey = process.env.ONESIGNAL_APP_AUTH_KEY;
  const appId = process.env.ONESIGNAL_APP_ID;
  if (!userAuthKey || !appAuthKey || !appId) {
    throw new Error(
      "OneSignal está activado, pero faltan sus variables de configuración"
    );
  }

  myClient = new OneSignal.Client({
    userAuthKey: userAuthKey,
    app: { appAuthKey: appAuthKey, appId: appId },
  });
  return myClient;
};

const checkPremios = async function (type) {
  const response = await getPremios(type);
  if (response.status !== 0) {
    await prepareDrawStorage(type);
    if (type === "navidad") {
      await _checkNavidad(response, type);
    } else {
      await _checkNino(response, type);
    }
  }
};

const _checkNavidad = async (response, type) => {
  for (let count = 1; count <= 13; count++) {
    const numberIndex = "numero" + count;
    const value = response[numberIndex];
    if (value !== "-1" && value !== -1 && value !== undefined) {
      await checkCreateAndPush(numberIndex, pad(value, 5), type);
    }
  }
};

// const _checkNino = async (response, type) => {
//   // el 1, 2 y 3
//   const listaPremios = response.bet;
//   let number;
//   for (let numberIndex in listaPremios) {
//     let numeroDePremio = numberIndex.replace("P", "");
//     if (listaPremios[numberIndex]) {
//       number = pad(listaPremios[numberIndex], 5);
//       await checkCreateAndPush("premio" + numeroDePremio, number, type);
//     }
//   }

//   const extracciones = response.other.extractions;
//   for (let numberIndex in extracciones) {
//     let numeroDePremio = numberIndex.replace("T", "");
//     let count = 0;
//     for (let premio of extracciones[numberIndex]) {
//       if (premio) {
//         await checkCreateAndPush(
//           "extracciones" + numeroDePremio + "cifras" + (count + 1),
//           premio,
//           type
//         );
//         count++;
//       }
//     }
//   }

//   const reintegros = response.other.num_refund;
//   let count = 0;

//   for (let premio of reintegros) {
//     if (premio) {
//       await checkCreateAndPush("reintegros" + (count + 1), premio, type);
//       count++;
//     }
//   }
// };

const _checkNino = async (response, type) => {
  if (response.Primer_premio !== "-1" && response.Primer_premio !== -1) {
    await checkCreateAndPush(
      "premio1",
      pad(response["Primer_premio"], 5),
      type
    );
  }
  if (response.Segundo_Premio !== "-1" && response.Segundo_Premio !== -1) {
    await checkCreateAndPush(
      "premio2",
      pad(response["Segundo_Premio"], 5),
      type
    );
  }
  if (response.Tercer_Premio !== "-1" && response.Tercer_Premio !== -1) {
    await checkCreateAndPush(
      "premio3",
      pad(response["Tercer_Premio"], 5),
      type
    );
  }

  if (
    response.Extraccion_3_cifras_1 !== "-1" &&
    response.Extraccion_3_cifras_1 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras1",
      response.Extraccion_3_cifras_1,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_2 !== "-1" &&
    response.Extraccion_3_cifras_2 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras2",
      response.Extraccion_3_cifras_2,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_3 !== "-1" &&
    response.Extraccion_3_cifras_3 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras3",
      response.Extraccion_3_cifras_3,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_4 !== "-1" &&
    response.Extraccion_3_cifras_4 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras4",
      response.Extraccion_3_cifras_4,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_5 !== "-1" &&
    response.Extraccion_3_cifras_5 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras5",
      response.Extraccion_3_cifras_5,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_6 !== "-1" &&
    response.Extraccion_3_cifras_6 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras6",
      response.Extraccion_3_cifras_6,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_7 !== "-1" &&
    response.Extraccion_3_cifras_7 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras7",
      response.Extraccion_3_cifras_7,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_8 !== "-1" &&
    response.Extraccion_3_cifras_8 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras8",
      response.Extraccion_3_cifras_8,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_9 !== "-1" &&
    response.Extraccion_3_cifras_9 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras9",
      response.Extraccion_3_cifras_9,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_10 !== "-1" &&
    response.Extraccion_3_cifras_10 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras10",
      response.Extraccion_3_cifras_10,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_11 !== "-1" &&
    response.Extraccion_3_cifras_11 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras11",
      response.Extraccion_3_cifras_11,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_12 !== "-1" &&
    response.Extraccion_3_cifras_12 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras12",
      response.Extraccion_3_cifras_12,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_13 !== "-1" &&
    response.Extraccion_3_cifras_13 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras13",
      response.Extraccion_3_cifras_13,
      type
    );
  }
  if (
    response.Extraccion_3_cifras_14 !== "-1" &&
    response.Extraccion_3_cifras_14 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones3cifras14",
      response.Extraccion_3_cifras_14,
      type
    );
  }

  if (
    response.Extraccion_2_cifras_1 !== "-1" &&
    response.Extraccion_2_cifras_1 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones2cifras1",
      response.Extraccion_2_cifras_1,
      type
    );
  }
  if (
    response.Extraccion_2_cifras_2 !== "-1" &&
    response.Extraccion_2_cifras_2 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones2cifras2",
      response.Extraccion_2_cifras_2,
      type
    );
  }
  if (
    response.Extraccion_2_cifras_3 !== "-1" &&
    response.Extraccion_2_cifras_3 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones2cifras3",
      response.Extraccion_2_cifras_3,
      type
    );
  }
  if (
    response.Extraccion_2_cifras_4 !== "-1" &&
    response.Extraccion_2_cifras_4 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones2cifras4",
      response.Extraccion_2_cifras_4,
      type
    );
  }
  if (
    response.Extraccion_2_cifras_5 !== "-1" &&
    response.Extraccion_2_cifras_5 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones2cifras5",
      response.Extraccion_2_cifras_5,
      type
    );
  }

  if (
    response.Extraccion_4_cifras_1 !== "-1" &&
    response.Extraccion_4_cifras_1 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones4cifras1",
      response.Extraccion_4_cifras_1,
      type
    );
  }
  if (
    response.Extraccion_4_cifras_2 !== "-1" &&
    response.Extraccion_4_cifras_2 !== -1
  ) {
    await checkCreateAndPush(
      "extracciones4cifras2",
      response.Extraccion_4_cifras_2,
      type
    );
  }

  if (response.Reintegro_1 !== "-1" && response.Reintegro_1 !== -1) {
    await checkCreateAndPush("reintegros1", response.Reintegro_1, type);
  }
  if (response.Reintegro_2 !== "-1" && response.Reintegro_2 !== -1) {
    await checkCreateAndPush("reintegros2", response.Reintegro_2, type);
  }
  if (response.Reintegro_3 !== "-1" && response.Reintegro_3 !== -1) {
    await checkCreateAndPush("reintegros3", response.Reintegro_3, type);
  }
};

const _sendPush = (numberIndex, number, type) => {
  return new Promise((resolve) => {
    let client;
    try {
      client = getOneSignalClient();
    } catch (error) {
      console.error(error.message);
      resolve();
      return;
    }
    if (!client) {
      console.log("OneSignal desactivado; no se envía", numberIndex);
      resolve();
      return;
    }

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
      const testPlayerIds = (process.env.ONESIGNAL_TEST_PLAYER_IDS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (testPlayerIds.length === 0) {
        console.log("OneSignal no tiene destinatarios de prueba configurados");
        resolve();
        return;
      }
      firstNotification.postBody["include_player_ids"] = testPlayerIds;
    }

    client.sendNotification(
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
  const path = firebaseResults.resultPath(type, numberIndex);
  console.log(path);
  return firebase.database().ref(path).set({
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

const getPremios = async (type) => {
  return getLegacySummary(type);
};

const prepareDrawStorage = async (type) => {
  const config = getDrawConfig(type);
  const root = firebaseResults.resultsRootPath(type);
  const reference = firebase.database().ref(root);
  const snapshot = await reference.once("value");
  const values = snapshot.val();

  if (values && values._meta && values._meta.year === config.year) {
    return;
  }

  await reference.set({
    _meta: {
      year: config.year,
      source: "rtve",
      initializedAt: new Date().toISOString(),
    },
  });
};

const checkCreateAndPush = async (index, number, type) => {
  const snapshot = await firebase
    .database()
    .ref(firebaseResults.resultPath(type, index))
    .once("value");

  const storedValue = snapshot.val();
  if (storedValue && storedValue.number === number) {
    return;
  }

  await _createNumberInDataBase(index, number, type);
  if (storedValue !== null) {
    console.log("Premio corregido en Firebase; no se reenvía push", index);
    return;
  }

  if (
    !index.includes("extracciones2cifra") &&
    !index.includes("extracciones3cifra") &&
    !index.includes("extracciones4cifra")
  ) {
    console.log("a push", index);
    await _sendPush(index, number, type);
  }
};

module.exports = checkPremios;
