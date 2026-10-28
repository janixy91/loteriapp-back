var express = require("express");
var router = express.Router();
var getPrizePerDecimo = require("../services/lottery/rtveProvider")
  .getPrizePerDecimo;
var isDrawStarted = require("../services/lottery/config").isDrawStarted;
var getDrawConfig = require("../services/lottery/config").getDrawConfig;
var simulator = require("../services/lottery/simulator");

//  no se esta usando
router.get("/", async function (req, res, next) {
  let data;
  if (inTime(req.query.type)) {
    try {
      const response = await checkOne(req.query.code, req.query.type, req);
      const status = getStatus(response.status, response.total);
      data = getData(response, status, req.query.amount);
    } catch (e) {
      console.error("No se pudo comprobar el décimo:", e.message);
      data = getDataUnavailable();
    }
  } else {
    data = getDataPending();
  }
  res.json(data);
});

router.post("/", async function (req, res, next) {
  const decimos = Array.isArray(req.body.data) ? req.body.data : [];
  let data;

  if (inTime(req.query.type)) {
    try {
      let total = 0;
      let sourceStatus = 0;
      const responses = await Promise.all(
        decimos.map((decimo) => checkOne(decimo.number, req.query.type, req))
      );

      responses.forEach((response, index) => {
        const decimo = decimos[index];
        const status = getStatus(response.status, response.total);
        const premio = getQuantityByAmount(decimo.amount, response.total);

        sourceStatus = Math.max(sourceStatus, Number(response.status) || 0);
        if (status === "win") {
          total += premio;
        }

        decimo.status = status;
        decimo.statusElPais = response.status;
        decimo.quantity = premio;
      });

      const status =
        sourceStatus === 0 ? "pending" : total > 0 ? "win" : "lost";
      data = {
        error: 0,
        quantity: total,
        message: getMessage(status, total, sourceStatus),
        decimos: decimos,
      };
    } catch (e) {
      console.error("No se pudieron comprobar los décimos:", e.message);
      data = getDataUnavailable(decimos);
    }
  } else {
    data = getDataPending(decimos);
  }

  res.json(data);
});

const inTime = (type) => {
  try {
    return isDrawStarted(type) || simulator.isActive(type);
  } catch (error) {
    return false;
  }
};

const checkOne = async (number, type, req) => {
  if (!simulator.isActive(type)) {
    return getPrizePerDecimo(type, number);
  }
  return getPrizePerDecimo(type, number, {
    config: {
      ...getDrawConfig(type),
      sourceName: "simulator",
      sourceRoot: simulator.sourceRoot(type, simulator.requestOrigin(req)),
    },
  });
};

const getData = (response, status, amount) => {
  const premio = getQuantityByAmount(amount, response.total);
  return {
    error: 0,
    quantity: premio,
    status: status,
    message: getMessage(status, premio, response.status),
  };
};

const getDataPending = (decimos = []) => {
  return {
    error: 0,
    quantity: 0,
    status: "pending",
    message: {
      text: "El sorteo no ha empezado",
      title: "¡Una cosa!",
    },
    decimos: decimos,
  };
};

const getDataUnavailable = (decimos = []) => {
  return {
    error: 1,
    quantity: 0,
    status: "pending",
    message: {
      text: "No podemos actualizar los resultados ahora. Inténtalo de nuevo en unos minutos.",
      title: "Resultados temporalmente no disponibles",
    },
    decimos: decimos,
  };
};

const getQuantityByAmount = (amount, premio) => {
  return (premio / 20) * amount;
};

const getStatus = (resStatus, premio) => {
  const sourceStatus = Number(resStatus);
  if (!Number.isFinite(sourceStatus) || sourceStatus === 0) {
    return "pending";
  }
  return premio > 0 ? "win" : "lost";
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
