var express = require("express");
var router = express.Router();
var request = require("request-promise-native");

var YEARNAVIDAD = 2024;
var YEARNINO = YEARNAVIDAD + 1;

//  no se esta usando
router.get("/", async function (req, res, next) {
  let data;
  if (inTime(req.query.type)) {
    let response = null;
    try {
      response = await checkOne(req.query.code, req.query.type);
    } catch (e) {
      console.log("este es el error", JSON.stringify(e));
    }

    console.log(response, "responses");
    const status = getStatus(response.status, response.total);
    data = getData(response, status, req.query.amount);
  } else {
    data = getDataPending();
  }
  res.json(data);
});

router.post("/", async function (req, res, next) {
  const decimos = req.body.data;
  let data;

  if (inTime(req.query.type)) {
    let total = 0;
    let status;
    let statusElPais;
    for (let decimo of decimos) {
      let response = null;
      try {
        response = await checkOne(decimo.number, req.query.type);
        if (response) {
          statusElPais = response.status;
          status = getStatus(statusElPais, response.total, response.timestamp);
          const premio = getQuantityByAmount(decimo.amount, response.total);
          if (status === "pending") {
            break;
          } else if (status === "win") {
            total += premio;
          }
          decimo.status = status;
          decimo.statusElPais = statusElPais;
          decimo.quantity = premio;
          if (status !== "pending") {
            status = total > 0 ? "win" : "lost";
          }
          const message = getMessage(status, total, statusElPais);
          data = {
            error: 0,
            quantity: total,
            message: message,
            decimos: decimos,
          };
        } else {
          data = getDataPending();
        }
      } catch (e) {
        console.log("error333333333333", JSON.stringify(e));
      }
    }
  } else {
    data = getDataPending();
  }

  res.json(data);
});

const inTime = (type) => {
  return (
    (type === "navidad" && new Date() > new Date(`${YEARNAVIDAD}/12/22`)) ||
    (type === "nino" && new Date() > new Date(`${YEARNINO}/01/6`))
  );
};

const checkOne = async (number, type) => {
  try {
    const response = await fetch(
      type === "navidad"
        ? "https://api-loteria.pabloclementeperez.com/output/LoteriaNavidad.json"
        : "https://api-loteria.pabloclementeperez.com/output/LoteriaElNino.json"
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    const premioEncontrado = buscarPremioPorNumero(data, number);
    return {
      total: premioEncontrado,
      status: data.status,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Hubo un problema con la solicitud Fetch:", error);
    throw error; // Lanza el error para que pueda ser manejado por quien llame a la función
  }
};

// Función para buscar el premio por número
function buscarPremioPorNumero(premios, numero, cantidadJugado = 20) {
  const premio = premios[parseInt(numero)]; // Busca el premio por número
  if (premio) {
    const premioNumerico = parseInt(premio, 10); // Convierte el premio a número
    const premioProporcional = premioNumerico / 10; // Calcula el premio proporcional
    return premioProporcional; // Devuelve el premio proporcional
  }
  return 0; // Devuelve 0 si no se encuentra el premio
}

const getData = (response, status, amount) => {
  const premio = getQuantityByAmount(amount, response.total);
  return {
    error: 0,
    quantity: premio,
    status: status,
    message: getMessage(status, premio, response.status),
  };
};

const getDataPending = () => {
  return {
    error: 0,
    quantity: 0,
    status: "pending",
    message: {
      text: "El sorteo no ha empezado",
      title: "¡Una cosa!",
    },
    decimos: [],
  };
};

const getQuantityByAmount = (amount, premio) => {
  return (premio / 20) * amount;
};

const getStatus = (resStatus, premio) => {
  let isYear =
    new Date().getFullYear() === YEARNAVIDAD ||
    new Date().getFullYear() === YEARNINO;
  // isYear = true;
  let status;

  console.log(premio, "resStatusresStatusresStatus");

  if (!isYear) {
    status = "pending";
  } else if (premio > 0) {
    status = "win";
  } else if (premio === 0) {
    status = "lost";
  } else {
    status = "pending";
  }

  return status;
};

const getMessage = (status, premio, responseStatus) => {
  let message;

  if (status === "pending") {
    message = {
      text: "El proveedor de datos no está funcionando",
      title: "Hay un error con el proveedor",
    };
  } else if (status === "win") {
    if (responseStatus !== 4) {
      message = {
        text: `¡Es posible que hayas GANADO ${premio}€!, pero los datos aún no son definitivos`,
        title: "¡Posible Premio!",
      };
    } else {
      message = {
        text: `¡ Segun los datos proporcionados por el proveedor has GANADO ${premio}€!`,
        title: "¡Premio!",
      };
    }
  } else if (status === "lost") {
    if (responseStatus !== 4) {
      message = {
        text: `Es posible que no hayas sido premiado, pero los datos aún no son definitivos`,
        title: "Lo sentimos",
      };
    } else {
      message = {
        text: `Segun los datos proporcionados por el proveedor no has sido premiado.`,
        title: "Lo sentimos",
      };
    }
  }

  return message;
};

module.exports = router;
