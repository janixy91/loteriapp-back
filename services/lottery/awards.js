"use strict";

function award(value, width) {
  if (value === undefined || value === null || Number(value) < 0) {
    return null;
  }
  return { number: String(value).padStart(width, "0") };
}

function joinAwards(summary, prefix, count, width) {
  return Array.from({ length: count }, (_, index) => {
    const value = summary[`${prefix}${index + 1}`];
    const formatted = award(value, width);
    return formatted ? formatted.number : "-";
  }).join(", ");
}

function formatNavidad(summary) {
  const result = {};
  for (let index = 1; index <= 13; index++) {
    const formatted = award(summary[`numero${index}`], 5);
    if (formatted) {
      result[`numero${index}`] = formatted;
    }
  }
  return result;
}

function formatNino(summary) {
  const result = {};
  const majorPrizes = [
    ["premio1", "Primer_premio"],
    ["premio2", "Segundo_Premio"],
    ["premio3", "Tercer_Premio"],
  ];

  majorPrizes.forEach(([outputKey, sourceKey]) => {
    const formatted = award(summary[sourceKey], 5);
    if (formatted) {
      result[outputKey] = formatted;
    }
  });

  result.extracciones4cifras = {
    number: joinAwards(summary, "Extraccion_4_cifras_", 2, 4),
  };
  result.extracciones3cifras = {
    number: joinAwards(summary, "Extraccion_3_cifras_", 14, 3),
  };
  result.extracciones2cifras = {
    number: joinAwards(summary, "Extraccion_2_cifras_", 5, 2),
  };
  result.reintegros = {
    number: joinAwards(summary, "Reintegro_", 3, 1),
  };
  return result;
}

function formatAwards(type, summary) {
  if (type === "navidad") {
    return formatNavidad(summary);
  }
  if (type === "nino") {
    return formatNino(summary);
  }
  throw new Error(`Tipo de sorteo no soportado: ${type}`);
}

module.exports = { formatAwards };
