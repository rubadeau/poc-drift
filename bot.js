require('dotenv').config();
const express = require('express');
const bot = express();
const bodyParser = require('body-parser');
const request = require('request');

bot.use(bodyParser.json());
bot.listen(process.env.PORT || 3000, () => console.log('POC Bot for Drift is listening on port 3000!'));

bot.post('/', (message, res) => {
  if (message.body.type === 'new_message' && message.body.data.body.startsWith('/foobar')) {



    let options = {
      url: 'https://driftapi.com/contacts/' + message.body.data.author.id,
      headers: {
        'User-Agent': 'request',
        'Authorization': 'Bearer ' + process.env.DRIFTOAUTH,
      }
    };
    request(options, function(err, response, body) {
      if (err) {
        console.log(err);
      } else {
        console.log(response.statusCode);

        let driftContact = JSON.parse(body);
        console.log('CONTACT: ');
        console.log(driftContact);
      }
    })



  }
  return res.send('ok')
});