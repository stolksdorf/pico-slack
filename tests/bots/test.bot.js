const Slack = require('../../pico-slack.js');


Slack.onConnect(async ()=>{
	//console.log(Slack);

	const testbot = Slack.alias('testbot', 'mega');

	Slack.log('sending message', 6);
	const event = await Slack.send('general', 'hello world');
	Slack.react(event, ['one', 'two', 'three', 'four', 'five']);
	const event2 = await testbot.thread(event, 'I am in a thread!!');
	Slack.send(event2, 'Yeah you are!');
	//TODO: add an attachement
});

Slack.onMessage((msg)=>{
	console.log(msg);
});