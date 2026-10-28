#!/usr/bin/env node
"use strict";

const { getDrawConfig } = require("../services/lottery/config");
const { fetchSnapshotForConfig } = require("../services/lottery/rtveProvider");

async function main() {
  const type = process.argv[2];
  if (type !== "navidad" && type !== "nino") {
    throw new Error("Uso: node scripts/verify-rtve-source.js <navidad|nino>");
  }

  const config = getDrawConfig(type);
  const snapshot = await fetchSnapshotForConfig(config);
  console.log(
    JSON.stringify(
      {
        type: snapshot.type,
        year: snapshot.year,
        status: snapshot.status,
        source: snapshot.source,
        summaryPrizes: config.summaryKeys.filter(
          (key) => snapshot.summary[key] >= 0
        ).length,
        awardedNumbers: Object.keys(snapshot.prizes).length,
        fetchedAt: snapshot.fetchedAt,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
