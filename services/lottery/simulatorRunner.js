"use strict";

const firebase = require("../firebase");
const firebaseResults = require("./firebaseResults");
const provider = require("./rtveProvider");

function award(value, width) {
  return { number: String(value).padStart(width, "0") };
}

function storedAwards(type, summary) {
  const stored = {};
  if (type === "navidad") {
    for (let index = 1; index <= 13; index += 1) {
      const value = summary[`numero${index}`];
      if (value >= 0) {
        stored[`numero${index}`] = award(value, 5);
      }
    }
    return stored;
  }

  [
    ["premio1", "Primer_premio", 5],
    ["premio2", "Segundo_Premio", 5],
    ["premio3", "Tercer_Premio", 5],
  ].forEach(([target, source, width]) => {
    if (summary[source] >= 0) {
      stored[target] = award(summary[source], width);
    }
  });

  [
    ["extracciones4cifras", "Extraccion_4_cifras_", 2, 4],
    ["extracciones3cifras", "Extraccion_3_cifras_", 14, 3],
    ["extracciones2cifras", "Extraccion_2_cifras_", 5, 2],
    ["reintegros", "Reintegro_", 3, 1],
  ].forEach(([target, source, count, width]) => {
    for (let index = 1; index <= count; index += 1) {
      const value = summary[`${source}${index}`];
      if (value >= 0) {
        stored[`${target}${index}`] = award(value, width);
      }
    }
  });

  return stored;
}

async function run(type, config) {
  const snapshot = await provider.getSnapshot(type, {
    config,
    force: true,
  });

  if (snapshot.stale) {
    throw new Error(
      `La lectura simulada fue rechazada y se conserva la anterior: ${snapshot.sourceError}`
    );
  }

  const values = {
    _meta: {
      year: config.year,
      source: "simulator",
      status: snapshot.status,
      updatedAt: new Date().toISOString(),
      notificationsSent: false,
    },
    ...storedAwards(type, snapshot.summary),
  };

  await firebase.database().ref(firebaseResults.resultsRootPath(type)).set(values);
  return {
    snapshot,
    stored: firebaseResults.formatStoredResults(type, values),
  };
}

async function read(type) {
  const snapshot = await firebase
    .database()
    .ref(firebaseResults.resultsRootPath(type))
    .once("value");
  const values = snapshot.val();
  return values
    ? {
        meta: values._meta || null,
        results: firebaseResults.formatStoredResults(type, values),
      }
    : { meta: null, results: {} };
}

async function clear(type) {
  await firebase.database().ref(firebaseResults.resultsRootPath(type)).remove();
}

module.exports = { clear, read, run, storedAwards };
