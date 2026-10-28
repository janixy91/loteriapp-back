"use strict";

const MADRID_TIME_ZONE = "Europe/Madrid";

const SUMMARY_GROUPS = {
  navidad: [
    { selector: ".p1", keys: ["numero1"], width: 5 },
    { selector: ".p2", keys: ["numero2"], width: 5 },
    { selector: ".p3", keys: ["numero3"], width: 5 },
    { selector: ".p4", keys: ["numero4", "numero5"], width: 5 },
    {
      selector: ".p5",
      keys: Array.from({ length: 8 }, (_, index) => `numero${index + 6}`),
      width: 5,
    },
  ],
  nino: [
    { selector: ".p1", keys: ["Primer_premio"], width: 5 },
    { selector: ".p2", keys: ["Segundo_Premio"], width: 5 },
    { selector: ".p3", keys: ["Tercer_Premio"], width: 5 },
    {
      selector: ".p4",
      keys: ["Extraccion_4_cifras_1", "Extraccion_4_cifras_2"],
      width: 4,
    },
    {
      selector: ".p5",
      keys: Array.from(
        { length: 14 },
        (_, index) => `Extraccion_3_cifras_${index + 1}`
      ),
      width: 3,
    },
    {
      selector: ".p6",
      keys: Array.from(
        { length: 5 },
        (_, index) => `Extraccion_2_cifras_${index + 1}`
      ),
      width: 2,
    },
    {
      selector: ".p7",
      keys: Array.from({ length: 3 }, (_, index) => `Reintegro_${index + 1}`),
      width: 1,
    },
  ],
};

const MAJOR_PRIZES = {
  navidad: {
    numero1: 4000000,
    numero2: 1250000,
    numero3: 500000,
    numero4: 200000,
    numero5: 200000,
    numero6: 60000,
    numero7: 60000,
    numero8: 60000,
    numero9: 60000,
    numero10: 60000,
    numero11: 60000,
    numero12: 60000,
    numero13: 60000,
  },
  nino: {
    Primer_premio: 2000000,
    Segundo_Premio: 750000,
    Tercer_Premio: 250000,
  },
};

function madridYearAndMonth(now) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month) };
}

function configuredYear(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }

  const year = Number(value);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error(`${name} debe contener un año válido`);
  }
  return year;
}

function getSeasonYears(now = new Date()) {
  const { year, month } = madridYearAndMonth(now);
  const defaultNavidadYear = month === 1 ? year - 1 : year;
  const navidad = configuredYear("LOTTERY_NAVIDAD_YEAR", defaultNavidadYear);
  const nino = configuredYear("LOTTERY_NINO_YEAR", navidad + 1);
  return { navidad, nino };
}

function getDrawConfig(type, now = new Date()) {
  if (type !== "navidad" && type !== "nino") {
    throw new Error(`Tipo de sorteo no soportado: ${type}`);
  }

  const years = getSeasonYears(now);
  const isNavidad = type === "navidad";
  const year = years[type];
  const sourcePath = isNavidad ? "loteria-navidad" : "loteria-nino";
  const summaryKeys = SUMMARY_GROUPS[type].flatMap((group) => group.keys);

  return {
    type,
    year,
    label: isNavidad ? "Lotería de Navidad" : "Lotería del Niño",
    sourceRoot: `https://www.rtve.es/loterias/${sourcePath}/`,
    summaryContainerId: `viewLoteria${year}`,
    summaryGroups: SUMMARY_GROUPS[type],
    summaryKeys,
    majorPrizes: MAJOR_PRIZES[type],
    drawAt: new Date(
      isNavidad
        ? `${year}-12-22T09:00:00+01:00`
        : `${year}-01-06T12:00:00+01:00`
    ),
    officiallyVerified:
      process.env[
        isNavidad
          ? "LOTTERY_NAVIDAD_OFFICIALLY_VERIFIED"
          : "LOTTERY_NINO_OFFICIALLY_VERIFIED"
      ] === "true",
  };
}

function isDrawStarted(type, now = new Date()) {
  return now >= getDrawConfig(type, now).drawAt;
}

module.exports = {
  MADRID_TIME_ZONE,
  getDrawConfig,
  getSeasonYears,
  isDrawStarted,
};
