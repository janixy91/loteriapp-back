"use strict";

const cheerio = require("cheerio");
const fetch = require("node-fetch");

const { getDrawConfig } = require("./config");

const DEFAULT_CACHE_MS = 2 * 60 * 1000;
const DEFAULT_FAILURE_CACHE_MS = 30 * 1000;
const DEFAULT_TIMEOUT_MS = 20 * 1000;
const DEFAULT_CONCURRENCY = 5;
const USER_AGENT =
  "Loteriapp/2.0 (+https://github.com/janixy91/loteriapp-back)";
const cache = new Map();

class LotterySourceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "LotterySourceError";
    this.cause = cause;
  }
}

function integerEnvironment(name, fallback, minimum) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const value = Number(rawValue);
  return Number.isInteger(value) && value >= minimum ? value : fallback;
}

function cacheDuration() {
  return integerEnvironment("LOTTERY_SOURCE_CACHE_MS", DEFAULT_CACHE_MS, 10000);
}

function failureCacheDuration() {
  return integerEnvironment(
    "LOTTERY_SOURCE_FAILURE_CACHE_MS",
    DEFAULT_FAILURE_CACHE_MS,
    5000
  );
}

function requestTimeout() {
  return integerEnvironment(
    "LOTTERY_SOURCE_TIMEOUT_MS",
    DEFAULT_TIMEOUT_MS,
    1000
  );
}

function requestConcurrency() {
  return integerEnvironment(
    "LOTTERY_SOURCE_CONCURRENCY",
    DEFAULT_CONCURRENCY,
    1
  );
}

function digits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function parseNumber(value, width, label) {
  const normalized = digits(value);
  if (!normalized) {
    throw new LotterySourceError(`${label}: número vacío`);
  }

  const number = Number(normalized);
  if (!Number.isInteger(number) || number < 0 || number >= 10 ** width) {
    throw new LotterySourceError(
      `${label}: ${normalized} no es un número válido de ${width} cifras`
    );
  }
  return number;
}

function parsePrize(value, label) {
  const normalized = digits(value);
  const prize = Number(normalized);
  if (!normalized || !Number.isInteger(prize) || prize <= 0) {
    throw new LotterySourceError(`${label}: importe de premio no válido`);
  }
  return prize;
}

function parseSummary(html, config) {
  const $ = cheerio.load(html);
  const container = $(`#${config.summaryContainerId}`).first();

  if (!container.length) {
    const availableYears = $("[id^='viewLoteria']")
      .map((_, element) => $(element).attr("id"))
      .get()
      .join(", ");
    throw new LotterySourceError(
      `RTVE no publica todavía ${config.label} ${config.year}. ` +
        `Contenedores disponibles: ${availableYears || "ninguno"}`
    );
  }

  const summary = Object.fromEntries(
    config.summaryKeys.map((key) => [key, -1])
  );

  config.summaryGroups.forEach((group) => {
    const item = container.find(group.selector).first();
    if (!item.length) {
      return;
    }

    const values = item
      .find("span")
      .map((_, element) => $(element).text().trim())
      .get()
      .filter(Boolean);

    if (values.length > group.keys.length) {
      throw new LotterySourceError(
        `${config.label}: ${group.selector} contiene ${values.length} ` +
          `resultados; se esperaban como máximo ${group.keys.length}`
      );
    }

    values.forEach((value, index) => {
      const key = group.keys[index];
      summary[key] = parseNumber(value, group.width, key);
    });
  });

  return summary;
}

function parseNumbersPage(html, source = "RTVE") {
  const $ = cheerio.load(html);
  const table = $("table#millares").first();
  if (!table.length) {
    throw new LotterySourceError(`${source}: falta la tabla de números premiados`);
  }

  const prizes = {};
  table.find("tr").each((_, row) => {
    const currentRow = $(row);
    let numberNode = currentRow.children(".n").first();
    let prizeNode = currentRow.children(".p").first();

    if (!numberNode.length || !prizeNode.length) {
      const mainPrizeCell = currentRow.children("td[colspan]").first();
      numberNode = mainPrizeCell.find(".n").first();
      prizeNode = mainPrizeCell.find(".p").first();
    }

    if (!numberNode.length || !prizeNode.length) {
      return;
    }

    const numberText = digits(numberNode.text());
    if (!numberText) {
      return;
    }

    const number = Number(numberText);
    if (!Number.isInteger(number) || number < 0 || number > 99999) {
      throw new LotterySourceError(`${source}: número fuera de rango`);
    }

    const prize = parsePrize(prizeNode.text(), `${source} ${numberText}`);
    const key = String(number);
    if (prizes[key] !== undefined && prizes[key] !== prize) {
      throw new LotterySourceError(
        `${source}: importes contradictorios para ${numberText.padStart(5, "0")}`
      );
    }
    prizes[key] = prize;
  });

  return prizes;
}

async function fetchText(url) {
  if (!url.startsWith("https://")) {
    throw new LotterySourceError(`Se rechaza una fuente sin HTTPS: ${url}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout());
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LotterySourceError(
        `${url}: RTVE respondió con HTTP ${response.status}`
      );
    }
    if (!response.url.startsWith("https://")) {
      throw new LotterySourceError(`${url}: redirección fuera de HTTPS`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof LotterySourceError) {
      throw error;
    }
    throw new LotterySourceError(`${url}: no se pudo descargar`, error);
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency(items, concurrency, operation) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await operation(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function numberPageUrls(config) {
  return Array.from(
    { length: 20 },
    (_, index) =>
      `${config.sourceRoot}Loteria_${String(index * 5000).padStart(5, "0")}.shtml`
  );
}

function mergePrizes(pages) {
  const prizes = {};
  pages.forEach(({ url, html }) => {
    const pagePrizes = parseNumbersPage(html, url);
    Object.entries(pagePrizes).forEach(([number, prize]) => {
      if (prizes[number] !== undefined && prizes[number] !== prize) {
        throw new LotterySourceError(
          `RTVE publica importes contradictorios para ${number.padStart(5, "0")}`
        );
      }
      prizes[number] = prize;
    });
  });
  return prizes;
}

function validateMajorPrizes(config, summary, prizes) {
  Object.entries(config.majorPrizes).forEach(([key, minimumPrize]) => {
    const number = summary[key];
    if (number < 0) {
      return;
    }

    const actualPrize = prizes[String(number)] || 0;
    if (actualPrize < minimumPrize) {
      throw new LotterySourceError(
        `${key}=${String(number).padStart(5, "0")} tiene ${actualPrize}€ ` +
          `por serie; se esperaban al menos ${minimumPrize}€`
      );
    }
  });
}

function validateSuffixCoverage(config, summary, prizes) {
  const awardedNumbers = Object.keys(prizes).map((number) =>
    number.padStart(5, "0")
  );

  config.summaryGroups
    .filter((group) => group.width < 5)
    .forEach((group) => {
      group.keys.forEach((key) => {
        const number = summary[key];
        if (number < 0) {
          return;
        }

        const suffix = String(number).padStart(group.width, "0");
        const expected = 10 ** (5 - group.width);
        const matches = awardedNumbers.filter((candidate) =>
          candidate.endsWith(suffix)
        ).length;
        if (matches < expected) {
          throw new LotterySourceError(
            `${key}=${suffix} solo aparece en ${matches} números; ` +
              `se esperaban al menos ${expected}`
          );
        }
      });
    });
}

function validateSnapshot(snapshot, config) {
  const drawnCount = config.summaryKeys.filter(
    (key) => snapshot.summary[key] >= 0
  ).length;
  const prizeCount = Object.keys(snapshot.prizes).length;

  if (snapshot.status === 0 && (drawnCount > 0 || prizeCount > 0)) {
    throw new LotterySourceError("El estado no iniciado contiene premios");
  }
  if (snapshot.status > 0 && (drawnCount === 0 || prizeCount === 0)) {
    throw new LotterySourceError("El sorteo iniciado no contiene resultados");
  }
  if (snapshot.status >= 2 && drawnCount !== config.summaryKeys.length) {
    throw new LotterySourceError("El sorteo figura completo pero faltan premios");
  }
  if (snapshot.status === 4 && prizeCount < 10000) {
    throw new LotterySourceError(
      "No se puede marcar la lista como oficial: contiene menos de 10.000 números"
    );
  }

  validateMajorPrizes(config, snapshot.summary, snapshot.prizes);
  validateSuffixCoverage(config, snapshot.summary, snapshot.prizes);
  return snapshot;
}

async function fetchSnapshotForConfig(config) {
  const summaryHtml = await fetchText(config.sourceRoot);
  const summary = parseSummary(summaryHtml, config);
  const drawnCount = config.summaryKeys.filter((key) => summary[key] >= 0).length;

  if (drawnCount === 0) {
    return validateSnapshot(
      {
        type: config.type,
        year: config.year,
        status: 0,
        timestamp: Math.floor(Date.now() / 1000),
        fetchedAt: new Date().toISOString(),
        source: "rtve",
        summary,
        prizes: {},
      },
      config
    );
  }

  const urls = numberPageUrls(config);
  const htmlPages = await mapWithConcurrency(
    urls,
    requestConcurrency(),
    async (url) => ({ url, html: await fetchText(url) })
  );
  const prizes = mergePrizes(htmlPages);
  const complete = drawnCount === config.summaryKeys.length;
  const status = config.officiallyVerified && complete ? 4 : complete ? 2 : 1;

  return validateSnapshot(
    {
      type: config.type,
      year: config.year,
      status,
      timestamp: Math.floor(Date.now() / 1000),
      fetchedAt: new Date().toISOString(),
      source: "rtve",
      summary,
      prizes,
    },
    config
  );
}

function ensureMonotonic(previous, candidate, config) {
  if (!previous) {
    return;
  }
  if (candidate.status < previous.status) {
    throw new LotterySourceError(
      `Se rechaza una regresión de estado ${previous.status} -> ${candidate.status}`
    );
  }

  config.summaryKeys.forEach((key) => {
    if (previous.summary[key] >= 0 && candidate.summary[key] !== previous.summary[key]) {
      throw new LotterySourceError(`RTVE ha cambiado o retirado el premio ${key}`);
    }
  });

  Object.entries(previous.prizes).forEach(([number, prize]) => {
    if (candidate.prizes[number] === undefined || candidate.prizes[number] < prize) {
      throw new LotterySourceError(
        `RTVE ha retirado o reducido el premio del ${number.padStart(5, "0")}`
      );
    }
  });
}

async function getSnapshot(type, options = {}) {
  const now = options.now || new Date();
  const config = options.config || getDrawConfig(type, now);
  const cacheKey = `${config.type}:${config.year}`;
  const entry = cache.get(cacheKey) || {};
  const fresh =
    entry.snapshot && Date.now() - entry.fetchedAt < cacheDuration();

  if (!options.force && fresh) {
    return entry.snapshot;
  }
  if (
    !options.force &&
    entry.error &&
    Date.now() - entry.failedAt < failureCacheDuration()
  ) {
    throw entry.error;
  }
  if (entry.pending) {
    return entry.pending;
  }

  const pending = fetchSnapshotForConfig(config)
    .then((candidate) => {
      ensureMonotonic(entry.snapshot, candidate, config);
      cache.set(cacheKey, {
        snapshot: candidate,
        fetchedAt: Date.now(),
        pending: null,
      });
      return candidate;
    })
    .catch((error) => {
      if (entry.snapshot) {
        const staleSnapshot = {
          ...entry.snapshot,
          stale: true,
          sourceError: error.message,
        };
        cache.set(cacheKey, {
          snapshot: staleSnapshot,
          fetchedAt: Date.now(),
          pending: null,
        });
        return staleSnapshot;
      }
      cache.set(cacheKey, {
        error,
        failedAt: Date.now(),
        pending: null,
      });
      throw error;
    });

  cache.set(cacheKey, { ...entry, pending });
  return pending;
}

async function getLegacySummary(type, options = {}) {
  const snapshot = await getSnapshot(type, options);
  const legacy = {
    timestamp: snapshot.timestamp,
    status: snapshot.status,
    year: snapshot.year,
    ...snapshot.summary,
  };

  if (type === "navidad") {
    Object.assign(legacy, {
      fraseSorteoPDF: "",
      fraseListaPDF: "",
      listaPDF: "",
      urlAudio: "",
      error: 0,
    });
  }
  return legacy;
}

async function getPrizePerDecimo(type, number, options = {}) {
  const normalized = digits(number);
  if (!normalized || normalized.length > 5) {
    throw new LotterySourceError(`Número de décimo no válido: ${number}`);
  }

  const snapshot = await getSnapshot(type, options);
  const prizePerSeries = snapshot.prizes[String(Number(normalized))] || 0;
  return {
    total: prizePerSeries / 10,
    status: snapshot.status,
    timestamp: snapshot.fetchedAt,
    year: snapshot.year,
    stale: Boolean(snapshot.stale),
  };
}

function clearCache() {
  cache.clear();
}

module.exports = {
  LotterySourceError,
  clearCache,
  fetchSnapshotForConfig,
  getLegacySummary,
  getPrizePerDecimo,
  getSnapshot,
  parseNumbersPage,
  parseSummary,
  validateSnapshot,
};
