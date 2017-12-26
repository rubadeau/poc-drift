require('dotenv').config();
const express = require('express');
const bot = express();
const bodyParser = require('body-parser');
const Drift = require('drift-chat');

bot.use(bodyParser.json());
bot.listen(process.env.PORT || 3000, () => console.log('POC Bot for Drift is listening on port 3000!'));

bot.post('/', (message, res) => {
  if (message.body.type === 'new_message' && message.body.data.body.startsWith('/foobar')) {

    const drift = new Drift(process.env.DRIFTOAUTH);

    drift.getContact(message.body.data.author.id, function(err, statusCode, body) {
      if(err){
        console.log(err);
      } else {
        console.log(statusCode);
        console.log(body);
      }
    })
  }
  return res.send('ok')
});