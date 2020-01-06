var express = require('express');
var router = express.Router();
var firebase = require('firebase');

router.get('/', async function (req, res, next) {
  const environment = process.env.environment === 'pro' ? '' : '-dev'
  console.log("holi")
  firebase.database().ref(`/${req.query.type}${environment}`).once('value').then(async function (snapshot) {
    console.log(snapshot.val(), "bub")

    const values = snapshot.val();
    if (values) {
      values.reintegros = {
        number: `${values.reintegros1 ? values.reintegros1.number : '-'}, ${values.reintegros2 ? values.reintegros2.number : '-'}, ${values.reintegros3 ? values.reintegros3.number : '-'}`,
      }
      values.extracciones3cifras = {
        number: `${values.extracciones3cifras1 ? values.extracciones3cifras1.number : '-'}, ${values.extracciones3cifras2 ? values.extracciones3cifras2.number : '-'}, ${values.extracciones3cifras3 ? values.extracciones3cifras3.number : '-'}, ${values.extracciones3cifras4 ? values.extracciones3cifras4.number : '-'}, ${values.extracciones3cifras5 ? values.extracciones3cifras5.number : '-'}, ${values.extracciones3cifras6 ? values.extracciones3cifras6.number : '-'}, ${values.extracciones3cifras7 ? values.extracciones3cifras7.number : '-'}, ${values.extracciones3cifras8 ? values.extracciones3cifras8.number : '-'}, ${values.extracciones3cifras9 ? values.extracciones3cifras9.number : '-'}, ${values.extracciones3cifras10 ? values.extracciones3cifras10.number : '-'}, ${values.extracciones3cifras11 ? values.extracciones3cifras11.number : '-'}, ${values.extracciones3cifras12 ? values.extracciones3cifras12.number : '-'}, ${values.extracciones3cifras13 ? values.extracciones3cifras13.number : '-'}, ${values.extracciones3cifras14 ? values.extracciones3cifras14.number : '-'}`
      }

      values.extracciones4cifras = {
        number: `${values.extracciones4cifras1 ? values.extracciones4cifras1.number : '-'}, ${values.extracciones4cifras2 ? values.extracciones4cifras2.number : '-'}`,
      }

      values.extracciones2cifras = {
        number: `${values.extracciones2cifras1 ? values.extracciones2cifras1.number : '-'}, ${values.extracciones2cifras2 ? values.extracciones2cifras2.number : '-'}, ${values.extracciones2cifras3 ? values.extracciones2cifras3.number : '-'}, ${values.extracciones2cifras4 ? values.extracciones2cifras4.number : '-'}, ${values.extracciones2cifras5 ? values.extracciones2cifras5.number : '-'}`
      }
    }

    console.log(values, "values")
    res.json(values);
  });
});


module.exports = router;

