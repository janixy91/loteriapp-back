"use strict";

const crypto = require("crypto");
const express = require("express");

const lotteryConfig = require("../services/lottery/config");
const firebaseResults = require("../services/lottery/firebaseResults");
const provider = require("../services/lottery/rtveProvider");
const simulator = require("../services/lottery/simulator");
const simulatorRunner = require("../services/lottery/simulatorRunner");

const router = express.Router();

function simulatorOnly(req, res, next) {
  if (!simulator.isEnabled()) {
    res.status(404).send("Not Found");
    return;
  }
  next();
}

function sameSecret(value, expected) {
  const received = Buffer.from(value || "");
  const configured = Buffer.from(expected || "");
  return (
    received.length === configured.length &&
    received.length > 0 &&
    crypto.timingSafeEqual(received, configured)
  );
}

function authorizedOnly(req, res, next) {
  const token = process.env.LOTTERY_SIMULATOR_TOKEN;
  if (!token) {
    res.status(503).json({
      error: 1,
      message: "Falta configurar LOTTERY_SIMULATOR_TOKEN",
    });
    return;
  }
  if (!sameSecret(req.get("x-simulator-token"), token)) {
    res.status(401).json({ error: 1, message: "Token incorrecto" });
    return;
  }
  next();
}

function typeFromSource(source) {
  if (source === "loteria-navidad") {
    return "navidad";
  }
  if (source === "loteria-nino") {
    return "nino";
  }
  throw new Error("Fuente simulada no soportada");
}

function simulatedConfig(type, req) {
  const config = lotteryConfig.getDrawConfig(type);
  return {
    ...config,
    sourceName: "simulator",
    sourceRoot: simulator.sourceRoot(type, simulator.requestOrigin(req)),
  };
}

router.use(simulatorOnly);

router.get("/", function (req, res) {
  res.render("simulator", {
    title: "Simulador de sorteos · Loteriapp",
  });
});

router.get("/fuente/:source/", function (req, res) {
  try {
    const type = typeFromSource(req.params.source);
    const config = lotteryConfig.getDrawConfig(type);
    const scenario = simulator.getScenario(type);
    res.type("html").send(
      simulator.renderSummaryPage(type, scenario, config)
    );
  } catch (error) {
    res.status(404).send("Not Found");
  }
});

router.get("/fuente/:source/:file", function (req, res) {
  try {
    const match = /^Loteria_(\d{5})\.shtml$/.exec(req.params.file);
    if (!match) {
      res.status(404).send("Not Found");
      return;
    }
    const start = Number(match[1]);
    if (start % 5000 !== 0 || start < 0 || start > 95000) {
      res.status(404).send("Not Found");
      return;
    }

    const type = typeFromSource(req.params.source);
    const config = lotteryConfig.getDrawConfig(type);
    const scenario = simulator.getScenario(type);
    res.type("html").send(
      simulator.renderNumbersPage(type, scenario, start, config)
    );
  } catch (error) {
    res.status(404).send("Not Found");
  }
});

router.get("/api/state", function (req, res) {
  const navidadConfig = lotteryConfig.getDrawConfig("navidad");
  const ninoConfig = lotteryConfig.getDrawConfig("nino");
  res.json({
    enabled: true,
    pushesEnabled: false,
    types: {
      navidad: {
        year: navidadConfig.year,
        scenario: simulator.getScenario("navidad"),
        firebasePath: firebaseResults.resultsRootPath("navidad"),
      },
      nino: {
        year: ninoConfig.year,
        scenario: simulator.getScenario("nino"),
        firebasePath: firebaseResults.resultsRootPath("nino"),
      },
    },
  });
});

router.post("/api/scenario", authorizedOnly, function (req, res) {
  try {
    const scenario = simulator.setScenario(req.body.type, req.body.scenario);
    res.json({ ok: true, type: req.body.type, scenario });
  } catch (error) {
    res.status(400).json({ error: 1, message: error.message });
  }
});

router.post("/api/run", authorizedOnly, async function (req, res) {
  try {
    const type = req.body.type;
    if (req.body.scenario) {
      simulator.setScenario(type, req.body.scenario);
    }
    const config = simulatedConfig(type, req);
    const result = await simulatorRunner.run(type, config);
    res.json({
      ok: true,
      type,
      year: result.snapshot.year,
      status: result.snapshot.status,
      source: "simulator",
      firebasePath: firebaseResults.resultsRootPath(type),
      awardedNumbers: Object.keys(result.snapshot.prizes).length,
      stored: result.stored,
      pushesSent: false,
    });
  } catch (error) {
    res.status(422).json({ error: 1, message: error.message });
  }
});

router.get("/api/firebase", authorizedOnly, async function (req, res) {
  try {
    res.json(await simulatorRunner.read(req.query.type));
  } catch (error) {
    res.status(400).json({ error: 1, message: error.message });
  }
});

router.post("/api/reset", authorizedOnly, async function (req, res) {
  try {
    await simulatorRunner.clear(req.body.type);
    provider.clearCache();
    simulator.setScenario(req.body.type, "pending");
    res.json({ ok: true, type: req.body.type });
  } catch (error) {
    res.status(400).json({ error: 1, message: error.message });
  }
});

module.exports = router;
