var cron = require("node-cron");
console.log(process.env.cron);
var http = require("http");
var checkPremios = require("./checkPremios");

const isCron = process.env.cron;
console.log(process.env.environment);

if (!isCron || isCron !== "no") {
  // cron.schedule('*/20 * 22,6 Jan,Dec *', () => {
  //   console.log('no duermas');
  //   http.get("http://loteriapp-1.herokuapp.com/");
  // });

  cron.schedule(
    "*/20 10,11,12,13,14,15,16,17,18,19,20,21,22 * Jan,Dec *",
    () => {
      console.log("no duermas");
      http.get("http://loteriapp-1.herokuapp.com/");
    }
  );

  // cron.schedule('* * 22,6 Jan,Dec *', () => {
  cron.schedule("* * 1,6 Nov,Dec *", () => {
    if (new Date().getMonth() === 10) {
      console.log("go navidad");
      checkPremios("navidad");
    } else {
      console.log("go nino");
      checkPremios("nino");
    }
  });
}
