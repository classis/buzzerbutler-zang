import config from 'config';
import express from 'express';
import zang from 'zang-node';
import tingodb from 'tingodb';
import bodyParser from 'body-parser';

const engine = tingodb();
const dbPath = config.get('dbPath');
// const db = new engine.Db(dbPath, {});
var MongoClient = require('mongodb').MongoClient;

const dbhost = config.get('database.host');
const dbport = config.get('database.port');
const dbname = config.get('database.name');

var db;
// Connect to the db


const port = config.get('port');
const zangSid = config.get('zang.accountSid');
const zangToken = config.get('zang.authToken');
const locationName = config.get('locationName');
const openTone = config.get('openTone');
const phoneNumber = config.get('phoneNumber');
let accessCodesCol ;
let usersCol;
let users = [];
let accessCodes = [];
/* eslint-disable no-unused-vars */
const app = express();

const callsConnector = new zang.CallsConnector({
  accountSid: zangSid,
  authToken: zangToken
});

// Parse incoming POST params with Express middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const generateIntro = () => {
  const options = users.map(user => `to ${user.verb} ${user.name} press ${user.code}`).join();
  const whatToSay = `Welcome to ${locationName} ${options}`;
  console.log(whatToSay);
  return whatToSay;
};

app.put('/api/users', (req, res) => {
  console.log(req.body);
  usersCol.remove({});
  users = req.body;
  usersCol.insert(req.body, (err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.get('/api/users', (req, res) => {
  usersCol.find({}).toArray((err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.put('/api/accesscodes', (req, res) => {
  accessCodesCol.remove({});
  accessCodes = req.body;
  accessCodesCol.insert(req.body, (err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.get('/api/accesscodes', (req, res) => {
  accessCodesCol.find({}).toArray((err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});


// Passcode check
app.post('/zang/gatheraccesscode', (req, res) => {
  var ix = zang.inboundXml;
  var enums = zang.enums;

  var xmlDefinition;
  // const twiml = new VoiceResponse();
  if (req.body.Digits) {
    console.log(req.body.Digits);
    const exists = accessCodes.filter(object => (object.value === req.body.Digits));
    if (exists.length !== 0) {
      xmlDefinition = ix.response({ content: [ ix.say({
        text: 'Correct'
      })]});

    } else {
      xmlDefinition = ix.response({ content: [ ix.say({
        text: 'That is an incorrect accesscode'
      })]});
    }
  } else {
  }
  res.type('text/xml');
  console.log(xmlDefinition);
  ix.build(xmlDefinition).then(function(xml){
    console.log(xml);
    res.send(xml);
  });
  // res.send(twiml.toString());
});

// First choice menu
app.post('/zang/gatherchoice', (req, res) => {
  var ix = zang.inboundXml;
  var enums = zang.enums;

  var xmlDefinition;
  console.log(req.body);
  // const twiml = new VoiceResponse();
  if (req.body.Digits) {
    console.log(req.body.Digits);
    // If the user entered digits, process their request
    const selected = users.filter(object => (object.code === req.body.Digits))
      .map((object) => {
        if (object.verb === 'reach') {

          xmlDefinition = ix.response({ content: [
            ix.dial({ callerId: phoneNumber, content: [ object.phone
            ]})
          ]});

          // twiml.dial({ callerId: phoneNumber }, object.phone);
          // console.log(twiml.toString());
          // twiml.say(`${object.name} didnt answer`);
        } else if (object.verb === 'use') {
          // const gather = twiml.gather({ numDigits: 4, action: '/zang/gatheraccesscode' });
          xmlDefinition = ix.response({content: [
            ix.gather({ action: '/zang/gatheraccesscode', numDigits: 4, content:[     ix.say({
              text: 'Enter Passcode'
            })] })
          ]});
          // gather.say('Enter passcode');
        }
        return object;
      });
    if (selected.length === 0) {
      twiml.say('Sorry, I don\'t understand that choice.');
    }
  }
  res.type('text/xml');
  console.log(xmlDefinition);
  ix.build(xmlDefinition).then(function(xml){
    console.log(xml);
    res.send(xml);
  });
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});


// Starting point
app.post('/zang', (req, res) => {

  var ix = zang.inboundXml;
  var enums = zang.enums;

  var xmlDefinition = ix.response({content: [
    ix.gather({ action: '/zang/gatherchoice', numDigits: 1, content:[     ix.say({
      language: enums.Language.EN,
      loop: 3,
      text: generateIntro(),
      voice: enums.Voice.FEMALE
    })] })

  ]});

  ix.build(xmlDefinition).then(function(xml){
    console.log(xml);
    res.send(xml);
  }).catch(function(err){
    console.log('The generated XML is not valid!', err);
  });


  // const twiml = new VoiceResponse();
  // const gather = twiml.gather({ numDigits: 1, action: '/twilio/gatherchoice' });
  // gather.say(generateIntro());
  // twiml.redirect('/twilio');
  // res.type('text/xml');
  // res.send(twiml.toString());
});


app.listen(port, () => {
  MongoClient.connect(`mongodb://${dbhost}:${dbport}/${dbname}`, function(err, db) {
    if(!err) {
      console.log("We are connected");
      accessCodesCol = db.collection('access_codes');
      usersCol = db.collection('users');
      accessCodesCol.find({}).toArray((err, result) => {
        accessCodes = result;
      });
      usersCol.find({}).toArray((err, result) => {
        users = result;
      });
    }
  });

  console.log(`Listening on port ${port}`);
});
