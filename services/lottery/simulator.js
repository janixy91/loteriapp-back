"use strict";

const SCENARIOS = ["pending", "partial", "complete", "changed", "broken"];

const scenarioByType = {
  navidad: "pending",
  nino: "pending",
};

const FIXTURES = {
  navidad: {
    numero1: 79432,
    numero2: 12590,
    numero3: 42422,
    numero4: 77768,
    numero5: 48020,
    numero6: 37876,
    numero7: 72853,
    numero8: 74770,
    numero9: 45456,
    numero10: 45225,
    numero11: 97345,
    numero12: 60622,
    numero13: 87092,
  },
  nino: {
    Primer_premio: 6703,
    Segundo_Premio: 95379,
    Tercer_Premio: 32615,
    Extraccion_4_cifras_1: 2920,
    Extraccion_4_cifras_2: 8172,
    Extraccion_3_cifras_1: 186,
    Extraccion_3_cifras_2: 743,
    Extraccion_3_cifras_3: 480,
    Extraccion_3_cifras_4: 104,
    Extraccion_3_cifras_5: 311,
    Extraccion_3_cifras_6: 842,
    Extraccion_3_cifras_7: 724,
    Extraccion_3_cifras_8: 366,
    Extraccion_3_cifras_9: 401,
    Extraccion_3_cifras_10: 698,
    Extraccion_3_cifras_11: 297,
    Extraccion_3_cifras_12: 171,
    Extraccion_3_cifras_13: 54,
    Extraccion_3_cifras_14: 457,
    Extraccion_2_cifras_1: 25,
    Extraccion_2_cifras_2: 37,
    Extraccion_2_cifras_3: 45,
    Extraccion_2_cifras_4: 62,
    Extraccion_2_cifras_5: 68,
    Reintegro_1: 2,
    Reintegro_2: 8,
    Reintegro_3: 5,
  },
};

function validateType(type) {
  if (type !== "navidad" && type !== "nino") {
    throw new Error(`Tipo de sorteo no soportado: ${type}`);
  }
}

function isEnabled() {
  return (
    process.env.environment === "dev" &&
    process.env.LOTTERY_SIMULATOR_ENABLED === "true"
  );
}

function isActive(type) {
  validateType(type);
  return isEnabled() && getScenario(type) !== "pending";
}

function sourceRoot(type, origin) {
  validateType(type);
  const source = type === "navidad" ? "loteria-navidad" : "loteria-nino";
  return `${String(origin).replace(/\/$/, "")}/simulador/fuente/${source}/`;
}

function requestOrigin(req) {
  const configured = process.env.LOTTERY_SIMULATOR_PUBLIC_URL;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:") {
      throw new Error("LOTTERY_SIMULATOR_PUBLIC_URL debe usar HTTPS");
    }
    return url.origin;
  }

  const forwarded = String(req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const url = new URL(`${forwarded || req.protocol}://${req.get("host")}`);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(
      "Configura LOTTERY_SIMULATOR_PUBLIC_URL para usar el simulador desplegado"
    );
  }
  return url.origin;
}

function getScenario(type) {
  validateType(type);
  return scenarioByType[type];
}

function setScenario(type, scenario) {
  validateType(type);
  if (!SCENARIOS.includes(scenario)) {
    throw new Error(`Escenario del simulador no válido: ${scenario}`);
  }
  scenarioByType[type] = scenario;
  return scenario;
}

function resetScenarios() {
  scenarioByType.navidad = "pending";
  scenarioByType.nino = "pending";
}

function summaryFor(type, scenario, config) {
  validateType(type);
  const values = FIXTURES[type];
  const summary = Object.fromEntries(config.summaryKeys.map((key) => [key, -1]));

  if (scenario === "pending" || scenario === "broken") {
    if (scenario === "pending") {
      return summary;
    }
  }

  const visibleKeys = scenario === "partial" || scenario === "changed"
    ? config.summaryKeys.slice(0, 3)
    : config.summaryKeys;

  visibleKeys.forEach((key) => {
    summary[key] = values[key];
  });

  if (scenario === "changed") {
    summary[config.summaryKeys[0]] = type === "navidad" ? 12345 : 1234;
  }
  return summary;
}

function formatNumber(value, width) {
  return String(value).padStart(width, "0").replace(/(\d)(?=(\d{3})+$)/g, "$1.");
}

function renderSummaryPage(type, scenario, config) {
  if (scenario === "broken") {
    return `<!doctype html><html lang="es"><body><h1>Servicio temporalmente no disponible</h1></body></html>`;
  }

  const summary = summaryFor(type, scenario, config);
  const items = config.summaryGroups
    .map((group) => {
      const values = group.keys
        .map((key) => summary[key])
        .filter((value) => value >= 0)
        .map((value) => `<span>${formatNumber(value, group.width)}</span>`)
        .join("");
      return `<li class="${group.selector.slice(1)}">${values}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${config.label} ${config.year} · Fuente simulada</title>
    <style>
      body{margin:0;background:#f4f1ea;color:#182235;font:16px system-ui,sans-serif}
      header{padding:24px;background:#123c69;color:white}main{max-width:960px;margin:auto;padding:28px}
      .notice{padding:12px 16px;border-radius:10px;background:#fff3cd;color:#664d03}
      ol{display:grid;gap:14px;padding:0;list-style:none}li{display:flex;gap:12px;flex-wrap:wrap;padding:18px;background:white;border-radius:14px;box-shadow:0 8px 24px #12233b12}
      span{min-width:72px;padding:8px 10px;border-radius:8px;background:#e8f1fb;text-align:center;font-weight:800}
    </style>
  </head>
  <body>
    <header><strong>Fuente de pruebas con estructura compatible con RTVE</strong></header>
    <main>
      <p class="notice">Simulador de Loteriapp. No es una página oficial de RTVE.</p>
      <h1>${config.label} ${config.year}</h1>
      <ol id="${config.summaryContainerId}">${items}</ol>
    </main>
  </body>
</html>`;
}

function prizeForNumber(type, number, scenario, config) {
  const summary = summaryFor(type, scenario, config);
  let prize = 0;

  Object.entries(config.majorPrizes).forEach(([key, amount]) => {
    if (summary[key] === number) {
      prize = Math.max(prize, amount);
    }
  });

  if (type === "nino" && scenario === "complete") {
    const groups = [
      { prefix: "Extraccion_4_cifras_", count: 2, width: 4, amount: 3500 },
      { prefix: "Extraccion_3_cifras_", count: 14, width: 3, amount: 1000 },
      { prefix: "Extraccion_2_cifras_", count: 5, width: 2, amount: 400 },
      { prefix: "Reintegro_", count: 3, width: 1, amount: 200 },
    ];

    groups.forEach((group) => {
      for (let index = 1; index <= group.count; index += 1) {
        const suffix = String(summary[`${group.prefix}${index}`]).padStart(
          group.width,
          "0"
        );
        if (String(number).padStart(5, "0").endsWith(suffix)) {
          prize = Math.max(prize, group.amount);
        }
      }
    });
  }

  return prize;
}

function renderNumbersPage(type, scenario, start, config) {
  if (scenario === "broken" && start === 10000) {
    return "<!doctype html><html><body><p>Tabla no disponible</p></body></html>";
  }

  const rows = [];
  const end = Math.min(start + 5000, 100000);
  for (let number = start; number < end; number += 1) {
    const prize = prizeForNumber(type, number, scenario, config);
    if (prize > 0) {
      rows.push(
        `<tr><td class="n">${formatNumber(number, 5)}</td>` +
          `<td>—</td><td class="p">${formatNumber(prize, 1)}€</td></tr>`
      );
    }
  }

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Premios ${start}</title></head><body><table id="millares"><tbody>${rows.join(
    ""
  )}</tbody></table></body></html>`;
}

module.exports = {
  SCENARIOS,
  getScenario,
  isActive,
  isEnabled,
  renderNumbersPage,
  renderSummaryPage,
  requestOrigin,
  resetScenarios,
  setScenario,
  sourceRoot,
  summaryFor,
};
