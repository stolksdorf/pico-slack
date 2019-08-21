const app = require('express')();

const Slack = require('../pico-slack.js');
const BotLoader = require('../bot-loader.js');
const config = require('./slack_token.json');


Slack.log_channel = 'general';


Slack.connect(config.token)
	.then(()=>BotLoader('./tests/bots'))
	.then((bots)=>{
		console.log(bots);
		return bots.map((bot)=>bot.result && app.use(bot.result));
	})
	.then(()=>app.listen(8000))
	.then(()=>console.log('test server running: localhost:8000'));
// .catch((err)=>{
// 	console.log(err);
// });

