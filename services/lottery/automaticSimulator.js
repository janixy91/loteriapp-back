"use strict";

const checkPremios = require("../../cron/premios/checkPremios");
const provider = require("./rtveProvider");
const simulator = require("./simulator");
const simulatorRunner = require("./simulatorRunner");

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;
const runtimes = new Map();

function intervalMs() {
  const configured = Number(process.env.LOTTERY_SIMULATOR_INTERVAL_MS);
  return Number.isInteger(configured) && configured >= 10000
    ? configured
    : DEFAULT_INTERVAL_MS;
}

function publicState(type) {
  const runtime = runtimes.get(type);
  if (!runtime) {
    return {
      running: false,
      revealed: simulator.getRevealedCount(type),
      total: 0,
      intervalMs: intervalMs(),
      startedAt: null,
      nextAt: null,
      completedAt: null,
      lastPublishedAt: null,
      lastPrize: null,
      lastError: null,
    };
  }

  return {
    running: runtime.running,
    revealed: runtime.revealed,
    total: runtime.total,
    intervalMs: runtime.intervalMs,
    startedAt: runtime.startedAt,
    nextAt: runtime.nextAt,
    completedAt: runtime.completedAt,
    lastPublishedAt: runtime.lastPublishedAt,
    lastPrize: runtime.lastPrize,
    lastError: runtime.lastError,
  };
}

function stop(type) {
  const runtime = runtimes.get(type);
  if (runtime) {
    runtime.running = false;
    runtime.nextAt = null;
    if (runtime.timer) {
      clearTimeout(runtime.timer);
      runtime.timer = null;
    }
  }
  return publicState(type);
}

function reset(type) {
  stop(type);
  runtimes.delete(type);
  simulator.setRevealedCount(type, 0);
  return publicState(type);
}

function schedule(type, runtime) {
  if (!runtime.running || runtime.revealed >= runtime.total) {
    return;
  }
  runtime.nextAt = new Date(Date.now() + runtime.intervalMs).toISOString();
  runtime.timer = setTimeout(async () => {
    runtime.timer = null;
    runtime.nextAt = null;
    try {
      await publishNext(type, runtime);
    } catch (error) {
      runtime.lastError = error.message;
      console.error(`Error en el simulador automático de ${type}:`, error.message);
    }
    if (runtimes.get(type) === runtime) {
      schedule(type, runtime);
    }
  }, runtime.intervalMs);
}

async function publishNext(type, runtime) {
  if (!runtime.running || runtimes.get(type) !== runtime) {
    return publicState(type);
  }

  const revealed = runtime.revealed + 1;
  simulator.setRevealedCount(type, revealed);
  runtime.revealed = revealed;

  const summary = simulator.summaryFor(type, "automatic", runtime.config);
  const key = runtime.config.summaryKeys[revealed - 1];
  runtime.lastPrize = {
    key,
    number: String(summary[key]).padStart(
      runtime.config.summaryGroups.find((group) => group.keys.includes(key)).width,
      "0"
    ),
  };

  await checkPremios(type, {
    config: runtime.config,
    source: "simulator",
    providerOptions: { config: runtime.config, force: true },
  });

  runtime.lastPublishedAt = new Date().toISOString();
  runtime.lastError = null;
  if (runtime.revealed >= runtime.total) {
    runtime.running = false;
    runtime.completedAt = new Date().toISOString();
    runtime.nextAt = null;
  }
  return publicState(type);
}

async function start(type, config) {
  stop(type);
  await simulatorRunner.clear(type);
  provider.clearCache();
  simulator.setScenario(type, "automatic");
  simulator.setRevealedCount(type, 0);

  const runtime = {
    running: true,
    revealed: 0,
    total: config.summaryKeys.length,
    intervalMs: intervalMs(),
    startedAt: new Date().toISOString(),
    nextAt: null,
    completedAt: null,
    lastPublishedAt: null,
    lastPrize: null,
    lastError: null,
    timer: null,
    config,
  };
  runtimes.set(type, runtime);

  try {
    await publishNext(type, runtime);
  } catch (error) {
    runtime.lastError = error.message;
    runtime.running = false;
    throw error;
  }
  schedule(type, runtime);
  return publicState(type);
}

module.exports = { publicState, reset, start, stop };
