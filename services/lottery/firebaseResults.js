"use strict";

function validateType(type) {
  if (type !== "navidad" && type !== "nino") {
    throw new Error(`Tipo de sorteo no soportado: ${type}`);
  }
}

function resultsRootPath(type) {
  validateType(type);
  const environment = process.env.environment === "pro" ? "" : "-dev";
  return `/${type}${environment}`;
}

function resultPath(type, key) {
  return `${resultsRootPath(type)}/${key}`;
}

function numberOrDash(values, key) {
  return values[key] && values[key].number !== undefined
    ? values[key].number
    : "-";
}

function joinNumbers(values, prefix, count) {
  return Array.from({ length: count }, (_, index) =>
    numberOrDash(values, `${prefix}${index + 1}`)
  ).join(", ");
}

function formatStoredResults(type, storedValues) {
  validateType(type);
  const values = storedValues || {};
  const result = {};

  Object.keys(values).forEach((key) => {
    if (key !== "_meta") {
      result[key] = values[key];
    }
  });

  if (type === "nino") {
    result.reintegros = {
      number: joinNumbers(values, "reintegros", 3),
    };
    result.extracciones2cifras = {
      number: joinNumbers(values, "extracciones2cifras", 5),
    };
    result.extracciones3cifras = {
      number: joinNumbers(values, "extracciones3cifras", 14),
    };
    result.extracciones4cifras = {
      number: joinNumbers(values, "extracciones4cifras", 2),
    };
  }

  return result;
}

module.exports = {
  formatStoredResults,
  resultPath,
  resultsRootPath,
};
