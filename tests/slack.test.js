const Slack = require('../pico-slack.js');
const config = require('./slack_token.json');

Slack.setInfo('Cool guy', ':chart_with_upwards_trend:');


Slack.connect(config.token)
	.then(()=>console.log('connected!'))
	.then(()=>{
		console.log(Slack.users);
		console.log(Slack.bots);
		console.log(Slack.channels);
		console.log(Slack.dms);
		console.log(Slack.bot);
	})
	.then(()=>{
		return Slack.msg('general', 'Hey mang')
	})


Slack.onMessage((msg)=>{
	console.log('I got a message', msg);
	Slack.react(msg, ':thumbsup:')
		.catch((err)=>console.log(err))
});

Slack.onReact((reaction)=>{
	console.log(reaction);
})