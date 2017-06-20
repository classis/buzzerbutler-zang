const bodyParser = require('body-parser');
const config = require('config');
const cors = require('cors');
const express = require('express');
const zang = require('zang-node');

const butler = require('./butler');

const mongoose = require('mongoose');

const dbHost = config.get('database.host');
const dbPort = config.get('database.port');
const dbName = config.get('database.name');

const zangSid = config.get('zang.accountSid');
const zangToken = config.get('zang.authToken');
const phoneNumber = config.get('zang.phoneNumber');
console.log(zangSid, zangToken, phoneNumber);

const locationName = config.get('locationName');
const openTone = config.get('openTone');
const port = config.get('port');

const connectors = new zang.Connectors({
  accountSid: zangSid,
  authToken: zangToken
});

const ix = zang.inboundXml;

/* eslint-disable no-unused-vars */

const app = express();

// Parse incoming POST params with Express middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(cors());
// allow CORS
app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// TODO: change host to be non-fixed (and user-specified).
const FIXED_HOST_EMAIL = 'chrisdistrict@gmail.com';

const DB_STRING = `${dbHost}:${dbPort}/${dbName}`;
console.log('dbString: ' + DB_STRING);

mongoose.connect(DB_STRING);

const Schema = mongoose.Schema;

let User = mongoose.model('User', new Schema({
  hostEmail: String,
  name: String,
  phone: String,
  code: Number,
  address: String,
  createdAt: {type: Date, default: Date.now}
}));

let Entry = mongoose.model('Entry', new Schema({
  hostEmail: String,
  phone: String,
  authorizer: String,
  createdAt: {type: Date, default: Date.now}
}));

app.post('/zang', (req, res) => {
  console.log(req.body);
  User.find({host: FIXED_HOST_EMAIL}).exec(function (err, res) {
    const response = ix.response({
      content: [ix.gather({
        content: [ix.say({
          text: butler.generateIntro()
        })],
        action: '/zang/getDigits', numdigits: 1
      })],
    });
    butler.returnXML(response, res)

  });

});

// First choice menu
app.post('/zang/getDigits', (req, res) => {
  const code = req.body.Digits || '';
  if (code === '') {
    let noGo = say('Sorry, I didn\'t get the code you entered');
    return;
  }

  console.log('code entered: ' + code);

  // If the user entered digits, process their request.
  // TODO: search for the user that also corresponds to the particular host of the request.
  const selected = User.findOne({hostEmail: FIXED_HOST_EMAIL, code: code}).exec((err, person) => {
    if (err) {
      console.log('error: ' + err);
      let noGo = say('Sorry, the choice ' + code + ' does not map to a user.');
      return;
    }

    const phoneNumber = person.phone || '';
    if (phoneNumber === '') {
      console.log('error: no phone for user');
      let noGo = say('Sorry, ' + person.name + ' does not have their phone number configured');
      return;
    }

    const dialHost = ix.response({
      content: [ix.dial(person.phone)]
    });

    entry = new Entry({hostEmail: FIXED_HOST_EMAIL, authorizer: person.name, phone: person.phone});

    entry.save((err, res) => {
      console.log(err, res)
    });

    butler.returnXML(dialHost, res)
  })
});



// Insert an entry attempt by a particular user.
app.post('/api/addEntry', (req, res) => {
  const entry = req.body;
  Entry.insert(entry, (err, result) => {
    if (err) res.json(err);
    res.json(result);
  });
});

app.post('/api/addUser', (req, res) => {
  const user = new User(req.body || '');

  user.save((err, result) => {
    if (err) res.json(err);
    res.json(result);
  });
});

app.post('/api/removeUser', (req, res) => {
  const hostEmail = req.body.hostEmail || '';
  const phone = req.body.phone || '';
  User.remove({hostEmail: hostEmail, phone: phone}).exec((err, result) => {
    if (err) res.json(err);
    res.json(result);
  });
});

app.post('/api/getAllUsers', (req, res) => {
  User.find().exec((err, result) => {
    if (err) res.json(err);
    res.json(result);
  });
});

app.post('/api/getUsersForHost', (req, res) => {
  const hostEmail = req.body.hostEmail || '';
  User.find({hostEmail: hostEmail}).exec((err, result) => {
    if (err) res.json(err);
    res.json(result);
  });
});

// Test API route
app.post('/hello', (req, res) => {
  res.json('Hello World!');
});

function initTables(cb) {
  const user = new User({
    "hostEmail": "chrisdistrict@gmail.com",
    "name": "Chris",
    "phone": "5109266842",
    "code": 1,
    "address": "fake address"
  });
  user.save(cb);
}
// ** Start the server ** //

app.listen(port, () => {
  User.remove().exec((error, result) => {
    initTables(function (err, res) {
      if (err) console.log('err: ' + err);
      console.log('init tables.');
    });
    console.log(`Listening on port ${port}`);
  });

});
