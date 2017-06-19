import bodyParser from 'body-parser';
import config from 'config';
import express from 'express';
import tingodb from 'tingodb';
import zang from 'zang-node';

// const db = new engine.Db(dbPath, {});
// const dbPath = config.get('dbPath');
// const engine = tingodb();

// const accessCodesCol = db.collection('access_codes');
const locationName = config.get('locationName');
const openTone = config.get('openTone');
const phoneNumber = config.get('phoneNumber');
const port = config.get('port');
// const usersCol = db.collection('users');

const zangSid = config.get('zang.accountSid');
const zangToken = config.get('zang.authToken');

// const client = new Twilio(twilioSid, twilioToken);
// const VoiceResponse = Twilio.twiml.VoiceResponse;

const connectors = new zang.Connectors({
  accountSid: zangSid,
  authToken: zangToken
});

const ix = zang.inboundXml;

let users = [];
let accessCodes = [];
/* eslint-disable no-unused-vars */


const app = express();

// Parse incoming POST params with Express middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const generateIntro = () => {
  // const options = users.map(user => `to ${user.verb} ${user.name} press ${user.code}`).join();
  // const whatToSay = `Welcome to ${locationName} ${options}`;
  const whatToSay = 'hello, welcome';
  console.log(whatToSay);
  return whatToSay;
};

const returnXML = (payload, res) => {
  res.type('text/xml');
  ix.build(payload).then(xml => {
    console.log(xml)
      res.send(xml)
  });
}

const say = (text) => {ix.response({
  content: [ix.say({
    text: text
    })]
  });
};

app.post('/zang', (req, res) => {
  // const twiml = new VoiceResponse();
  console.log(req.body)

    const response = ix.response({
      content: [ ix.gather({ content: [ix.say({
          text: generateIntro()
        })],
          action: '/zang/gatherchoice', numDigits: 1
        })],
    });

  res.type('text/xml');

  returnXML(response, res)

  // ix.build(response).then(xml => {
  //   console.log(xml)
  //   res.send(xml)
  // });

});

// First choice menu
app.post('/zang/gatherchoice', (req, res) => {
  console.log(req.body);
  if (req.body.Digits) {
    console.log(req.body.Digits);

    // If the user entered digits, process their request
    const selected = users.filter(object => (object.code === req.body.Digits))
      .map((object) => {
        if (object.verb === 'reach') {

          const dialHost = ix.response({ content: [
            callerId: phoneNumber,
            ix.dial(object.phone)
          ]});


          res.type('text/xml');
          ix.build(dialhost).then(xml => {
            console.log(xml)
            res.send(xml)
          });

          returnXML(dialHost, res)

        } else if (object.verb === 'use') {

          const gather = ix.response({
            content: [ ix.gather({ content: [ix.say({
              text: "Enter passcode"
            })],
              action: '/twilio/gatheraccesscode', numDigits: 4
            })],
          });

          returnXML(gather, res)
        }

        return object;
      });
    if (selected.length === 0) {
      let noGo = say('Sorry, I don\'t understand that choice.' });
    }
  } else {
    twiml.redirect('/zang');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});


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

// TBD
// Passcode check
app.post('/twilio/gatheraccesscode', (req, res) => {

  //TBD
  const twiml = new VoiceResponse();

  if (req.body.Digits) {
    console.log(req.body.Digits);
    const exists = accessCodes.filter(object => (object.value === req.body.Digits));
    if (exists.length !== 0) {

      // TBD
      twiml.say('Correct');
      twiml.play({ digits: openTone });

    } else {
      twiml.say('That is an incorrect accesscode');
    }
  } else {
    // TBD
    twiml.redirect('/twilio');


  }
  res.type('text/xml');
  res.send(twiml.toString());
});

// app.post('/twilio/gatherchoice', (req, res) => {
//   const twiml = new VoiceResponse();
//   if (req.body.Digits) {
//     console.log(req.body.Digits);
//     // If the user entered digits, process their request
//     const selected = users.filter(object => (object.code === req.body.Digits))
//       .map((object) => {
//         if (object.verb === 'reach') {
//           twiml.dial({ callerId: phoneNumber }, object.phone);
//           console.log(twiml.toString());
//           twiml.say(`${object.name} didnt answer`);
//         } else if (object.verb === 'use') {
//           const gather = twiml.gather({ numDigits: 4, action: '/twilio/gatheraccesscode' });
//           gather.say('Enter passcode');
//         }
//         return object;
//       });
//     if (selected.length === 0) {
//       twiml.say({text: 'Sorry, I don\'t understand that choice.' });
//     }
//   } else {
//     twiml.redirect('/twilio');
//   }
//   res.type('text/xml');
//   res.send(twiml.toString());
// });

app.get('/', (req, res) => {
  res.send('Hello World!');
});


// app.post('/twilio', (req, res) => {
//   const twiml = new VoiceResponse();
//   const gather = twiml.gather({ numDigits: 1, action: '/twilio/gatherchoice' });
//   gather.say(generateIntro());
//   twiml.redirect('/twilio');
//   res.type('text/xml');
//   res.send(twiml.toString());
// });


app.listen(port, () => {
  // accessCodesCol.find({}).toArray((err, result) => {
    // accessCodes = result;
  // });
  // usersCol.find({}).toArray((err, result) => {
  //   users = result;
  // });
  // console.log(`Listening on port ${port}`);
});
