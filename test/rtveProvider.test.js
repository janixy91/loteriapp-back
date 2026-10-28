"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { getDrawConfig, getSeasonYears } = require("../services/lottery/config");
const { formatAwards } = require("../services/lottery/awards");
const {
  formatStoredResults,
  resultPath,
} = require("../services/lottery/firebaseResults");
const {
  LotterySourceError,
  parseNumbersPage,
  parseSummary,
  validateSnapshot,
} = require("../services/lottery/rtveProvider");
const simulator = require("../services/lottery/simulator");
const { storedAwards } = require("../services/lottery/simulatorRunner");

function withEnvironment(values, operation) {
  const previous = {};
  Object.entries(values).forEach(([key, value]) => {
    previous[key] = process.env[key];
    process.env[key] = value;
  });

  try {
    return operation();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
}

test("calcula una temporada Navidad/Niño coherente", () => {
  assert.deepEqual(getSeasonYears(new Date("2026-10-27T12:00:00+01:00")), {
    navidad: 2026,
    nino: 2027,
  });
  assert.deepEqual(getSeasonYears(new Date("2027-01-10T12:00:00+01:00")), {
    navidad: 2026,
    nino: 2027,
  });
});

test("permite fijar los años desde el entorno", () => {
  withEnvironment(
    { LOTTERY_NAVIDAD_YEAR: "2030", LOTTERY_NINO_YEAR: "2031" },
    () => {
      assert.equal(getDrawConfig("navidad").year, 2030);
      assert.equal(getDrawConfig("nino").year, 2031);
    }
  );
});

test("extrae el resumen de Navidad y conserva los premios pendientes", () => {
  const config = withEnvironment({ LOTTERY_NAVIDAD_YEAR: "2026" }, () =>
    getDrawConfig("navidad")
  );
  const html = `
    <ol id="viewLoteria2026">
      <li class="p1"><span>01.234</span></li>
      <li class="p2"><span>56.789</span></li>
      <li class="p4"><span>11.111</span><span>22.222</span></li>
    </ol>`;

  const summary = parseSummary(html, config);
  assert.equal(summary.numero1, 1234);
  assert.equal(summary.numero2, 56789);
  assert.equal(summary.numero3, -1);
  assert.equal(summary.numero4, 11111);
  assert.equal(summary.numero5, 22222);
  assert.equal(summary.numero13, -1);
});

test("rechaza silenciosamente usar la página de otro año", () => {
  const config = withEnvironment({ LOTTERY_NAVIDAD_YEAR: "2026" }, () =>
    getDrawConfig("navidad")
  );
  assert.throws(
    () => parseSummary('<ol id="viewLoteria2025"></ol>', config),
    LotterySourceError
  );
});

test("extrae números normales y premios mayores de las tablas de RTVE", () => {
  const html = `
    <table id="millares">
      <tr><td class="n">00.003</td><td>T</td><td class="p">1.200€</td></tr>
      <tr class="p1"><td colspan="3"><b class="n">79.432</b><b class="p">4.000.000€</b></td></tr>
    </table>`;

  assert.deepEqual(parseNumbersPage(html), {
    3: 1200,
    79432: 4000000,
  });
});

test("acepta el número 00000", () => {
  const html = `
    <table id="millares">
      <tr><td class="n">00.000</td><td>T</td><td class="p">200€</td></tr>
    </table>`;
  assert.deepEqual(parseNumbersPage(html), { 0: 200 });
});

test("valida que el premio mayor aparezca también en la lista completa", () => {
  const config = withEnvironment({ LOTTERY_NAVIDAD_YEAR: "2026" }, () =>
    getDrawConfig("navidad")
  );
  const summary = Object.fromEntries(
    config.summaryKeys.map((key) => [key, -1])
  );
  summary.numero1 = 79432;

  assert.throws(
    () =>
      validateSnapshot(
        {
          status: 1,
          summary,
          prizes: { 79432: 200 },
        },
        config
      ),
    /se esperaban al menos 4000000/
  );
});

test("mantiene el contrato de premios y los ceros iniciales del frontend", () => {
  assert.deepEqual(
    formatAwards("nino", {
      Primer_premio: 6703,
      Segundo_Premio: -1,
      Tercer_Premio: 32615,
      Extraccion_4_cifras_1: 82,
      Extraccion_4_cifras_2: -1,
      Extraccion_3_cifras_1: 58,
      Extraccion_2_cifras_1: 7,
      Reintegro_1: 0,
    }),
    {
      premio1: { number: "06703" },
      premio3: { number: "32615" },
      extracciones4cifras: { number: "0082, -" },
      extracciones3cifras: {
        number: "058, -, -, -, -, -, -, -, -, -, -, -, -, -",
      },
      extracciones2cifras: { number: "07, -, -, -, -" },
      reintegros: { number: "0, -, -" },
    }
  );
});

test("rechaza una extracción de El Niño que no cubra todos sus sufijos", () => {
  const config = withEnvironment({ LOTTERY_NINO_YEAR: "2027" }, () =>
    getDrawConfig("nino")
  );
  const summary = Object.fromEntries(
    config.summaryKeys.map((key) => [key, -1])
  );
  summary.Extraccion_4_cifras_1 = 82;

  assert.throws(
    () =>
      validateSnapshot(
        {
          status: 1,
          summary,
          prizes: { 82: 3500 },
        },
        config
      ),
    /se esperaban al menos 10/
  );
});

test("mantiene en Firebase las rutas que ya usaba la aplicación", () => {
  withEnvironment({ environment: "pro" }, () => {
    assert.equal(resultPath("navidad", "numero1"), "/navidad/numero1");
  });
  withEnvironment({ environment: "dev" }, () => {
    assert.equal(resultPath("nino", "premio1"), "/nino-dev/premio1");
  });
});

test("compone el listado de El Niño desde los premios guardados", () => {
  assert.deepEqual(
    formatStoredResults("nino", {
      _meta: { year: 2027, source: "rtve" },
      premio1: { number: "06703" },
      extracciones2cifras1: { number: "07" },
      reintegros1: { number: "0" },
    }),
    {
      premio1: { number: "06703" },
      extracciones2cifras1: { number: "07" },
      reintegros1: { number: "0" },
      reintegros: { number: "0, -, -" },
      extracciones2cifras: { number: "07, -, -, -, -" },
      extracciones3cifras: {
        number: "-, -, -, -, -, -, -, -, -, -, -, -, -, -",
      },
      extracciones4cifras: { number: "-, -" },
    }
  );
});

test("el simulador de Navidad genera el mismo contrato HTML que RTVE", () => {
  const config = withEnvironment({ LOTTERY_NAVIDAD_YEAR: "2026" }, () =>
    getDrawConfig("navidad")
  );
  const summary = parseSummary(
    simulator.renderSummaryPage("navidad", "partial", config),
    config
  );
  const prizes = parseNumbersPage(
    simulator.renderNumbersPage("navidad", "partial", 75000, config)
  );

  assert.equal(summary.numero1, 79432);
  assert.equal(summary.numero3, 42422);
  assert.equal(summary.numero4, -1);
  assert.equal(prizes[79432], 4000000);
  assert.doesNotThrow(() =>
    validateSnapshot({ status: 1, summary, prizes: {
      ...parseNumbersPage(simulator.renderNumbersPage("navidad", "partial", 10000, config)),
      ...parseNumbersPage(simulator.renderNumbersPage("navidad", "partial", 40000, config)),
      ...prizes,
    } }, config)
  );
});

test("el escenario completo de El Niño cubre todas las terminaciones", () => {
  const config = withEnvironment({ LOTTERY_NINO_YEAR: "2027" }, () =>
    getDrawConfig("nino")
  );
  const summary = parseSummary(
    simulator.renderSummaryPage("nino", "complete", config),
    config
  );
  const prizes = {};
  for (let start = 0; start < 100000; start += 5000) {
    Object.assign(
      prizes,
      parseNumbersPage(
        simulator.renderNumbersPage("nino", "complete", start, config)
      )
    );
  }

  assert.equal(summary.Primer_premio, 6703);
  assert.ok(Object.keys(prizes).length >= 10000);
  assert.doesNotThrow(() =>
    validateSnapshot({ status: 2, summary, prizes }, config)
  );
});

test("el simulador conserva las claves individuales que consume Firebase", () => {
  const config = withEnvironment({ LOTTERY_NINO_YEAR: "2027" }, () =>
    getDrawConfig("nino")
  );
  const summary = simulator.summaryFor("nino", "complete", config);
  const stored = storedAwards("nino", summary);

  assert.deepEqual(stored.premio1, { number: "06703" });
  assert.deepEqual(stored.extracciones4cifras1, { number: "2920" });
  assert.deepEqual(stored.extracciones3cifras13, { number: "054" });
  assert.deepEqual(stored.reintegros1, { number: "2" });
});

test("el simulador no puede habilitarse en producción", () => {
  withEnvironment(
    { environment: "pro", LOTTERY_SIMULATOR_ENABLED: "true" },
    () => assert.equal(simulator.isEnabled(), false)
  );
  withEnvironment(
    { environment: "dev", LOTTERY_SIMULATOR_ENABLED: "true" },
    () => assert.equal(simulator.isEnabled(), true)
  );
  withEnvironment(
    { environment: "", LOTTERY_SIMULATOR_ENABLED: "true" },
    () => assert.equal(simulator.isEnabled(), false)
  );
});
