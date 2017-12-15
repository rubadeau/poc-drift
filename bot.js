const express = require('express');
const bot = express();
const bodyParser = require('body-parser');

bot.use(bodyParser.json());
bot.listen(process.env.PORT || 3000, () => console.log('POC Bot for Drift is listening on port 3000!'));

bot.post('/', (req, res) => {
  if (req.body.type === 'new_message') {
    //TODO this is for demo purposes. Do not redact token & other info in production
    delete req.body.token;
    delete req.body.orgId;
    delete req.body.data.context;

    console.log("HERE IS YOUR FIRST EVENT: \n");
    console.log( req.body);
  }
  return res.send('ok')
});

