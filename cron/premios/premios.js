var cron = require('node-cron');
console.log(process.env.cron);
var http = require("http");
var checkPremios = require("./checkPremios");

const isCron = process.env.cron;

if (!isCron || isCron !== "no") {
  cron.schedule('*/20 * 14,6 Jan,Dec *', () => {
    console.log('no duermas');
    http.get("http://loteriapp-1.herokuapp.com/");
  });

  cron.schedule('* * 14,6 Jan,Dec *', () => {
    if (new Date().getMonth() === 11) {
      console.log('go navidad');
      checkPremios("navidad")
    } else {
      console.log('go nino');
      checkPremios("niño")
    }
  });
}

