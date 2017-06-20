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

const locationName = config.get('locationName');
const openTone = config.get('openTone');
const phoneNumber = config.get('phoneNumber');
const port = config.get('port');

const zangSid = config.get('zang.accountSid');
const zangToken = config.get('zang.authToken');

// const client = new Twilio(twilioSid, twilioToken);
// const VoiceResponse = Twilio.twiml.VoiceResponse;

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

// TODO: change host to be non-fixed (and user-specified).
const FIXED_HOST_EMAIL = 'chrisdistrict@gmail.com';

mongoose.connect(`${dbHost}:${dbPort}/${dbName}`);

const Users = mongoose.model('Users',{
  hostEmail: String,
  name: String,
  phone: String,
  code: Number
});

const Entries = mongoose.model('Entries',{
  hostEmail: String,
  name: String,
  phone: String,
  code: Number,
  created: {type: Date, default: Date.now}
});

app.post('/zang', (req, res) => {
  console.log(req.body);
  Users.find({host: FIXED_HOST_EMAIL}).exec(function (err, res) {
    const response = ix.response({
      content: [ix.gather({
        content: [ix.say({
          text: butler.generateIntro()
        })],
        action: '/zang/gatherchoice', numdigits: 1
      })],
    });
    butler.returnXML(response, res)

  });

});

// First choice menu
app.post('/zang/gatherchoice', (req, res) => {
  const code = req.body.digits || '';
  if (code === '') {
    let noGo = say('Sorry, I didn\'t get the code you entered');
    return;
  }

  console.log('code entered: ' + code);

  // If the user entered digits, process their request.
  // TODO: search for the user that also corresponds to the particular host of the request.
  const selected = Users.findOne({hostEmail: FIXED_HOST_EMAIL, code: code}, function (err, person) {
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

    butler.returnXML(dialHost, res)

  });
});

// Insert an entry attempt by a particular user.
app.post('/api/addEntry', (req, res) => {
  const entry = req.body;
  Entries.insert(entry, (err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.post('/api/addUser', (req, res) => {
  const user = new User(req.body || '');

  user.save((err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.post('/api/getUsers', (req, res) => {
  const hostEmail = req.body.hostEmail || '';
  Users.find({email: hostEmail}, (err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

// Test API route
app.get('/hello', (req, res) => {
  res.send('Hello World!');
});

// ** Start the server ** //

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
