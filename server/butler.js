/**
 * Created by cbuonocore on 6/19/17.
 */
/**
 * Created by cbuonocore on 5/28/17.
 */
'use strict';
const library = (function () {
  const generateIntro = () => {
    const whatToSay = 'Enter the code of the person you would like to reach';
    console.log(whatToSay);
    return whatToSay;
  };

  const returnXML = (payload, res) => {
    res.type('text/xml');
    ix.build(payload).then(xml => {
      console.log(xml);
      res.send(xml)
    });
  };

  const say = (text) => {
    ix.response({
      content: [ix.say({
        text: text
      })]
    });
  };

  return {
    say: say,
    returnXML: returnXML,
    generateIntro: generateIntro
  }
})();
module.exports = library;

