"use strict";

var express = require("express");
var router = express.Router();
var firebase = require("../services/firebase");
var lotteryConfig = require("../services/lottery/config");
var firebaseResults = require("../services/lottery/firebaseResults");
var lotteryProvider = require("../services/lottery/rtveProvider");

router.get("/status", async function (req, res) {
  const type = req.query.type;
  try {
    const config = lotteryConfig.getDrawConfig(type);
    if (!lotteryConfig.isDrawStarted(type)) {
      res.json({
        type: type,
        year: config.year,
        status: 0,
        source: "rtve",
        drawAt: config.drawAt.toISOString(),
      });
      return;
    }

    const snapshot = await lotteryProvider.getSnapshot(type);
    res.json({
      type: snapshot.type,
      year: snapshot.year,
      status: snapshot.status,
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
      stale: Boolean(snapshot.stale),
      awardedNumbers: Object.keys(snapshot.prizes).length,
    });
  } catch (error) {
    res.status(503).json({ error: 1, message: error.message });
  }
});

router.get("/", async function (req, res) {
  const type = req.query.type;
  try {
    const config = lotteryConfig.getDrawConfig(type);
    if (!lotteryConfig.isDrawStarted(type)) {
      res.json({});
      return;
    }

    const snapshot = await firebase
      .database()
      .ref(firebaseResults.resultsRootPath(type))
      .once("value");
    const values = snapshot.val();

    if (!values || !values._meta || values._meta.year !== config.year) {
      res.json({});
      return;
    }

    res.json(firebaseResults.formatStoredResults(type, values));
  } catch (error) {
    console.error("No se pudieron cargar los premios de Firebase:", error.message);
    res.status(503).json({
      error: 1,
      message: "Premios temporalmente no disponibles",
    });
  }
});

module.exports = router;
