var cron = require("node-cron");
var checkPremios = require("./checkPremios");

const isCron = process.env.cron;

const run = async (type) => {
  try {
    await checkPremios(type);
  } catch (error) {
    console.error(`Error actualizando ${type}:`, error.message);
  }
};

if (isCron !== "no") {
  cron.schedule("* * 22 12 *", () => run("navidad"), {
    timezone: "Europe/Madrid",
  });
  cron.schedule("* * 6 1 *", () => run("nino"), {
    timezone: "Europe/Madrid",
  });
}
