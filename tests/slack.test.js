const test = require('pico-check');
const Slack = require('../pico-slack.js');
const config = require('./slack_token.json');


const map = (obj, fn)=>Object.keys(obj).map((key)=>fn(obj[key], key));



//Slack.setInfo('Cool guy', ':chart_with_upwards_trend:');


test('connect', async (t)=>{
	return Slack.connect(config.token)
		.then(()=>t.pass());
}, { timeout : 5000 });


test.group('team info', (test)=>{
	test('users', (t)=>{
		map(Slack.users, (name, id)=>{
			t.is(id[0], 'U');
			t.type(name, 'string');
		});
	});
	test('bots', (t)=>{
		map(Slack.bots, (name, id)=>{
			t.is(id[0], 'B');
			t.type(name, 'string');
		});
	});

	test('channels', (t)=>{
		map(Slack.channels, (name, id)=>{
			t.is(id[0], 'C');
			t.type(name, 'string');
		});
	});
	test('dms', (t)=>{
		map(Slack.dms, (id, name)=>{
			t.is(id[0], 'D');
			t.type(name, 'string');
		});
	});
	test('bot info', (t)=>{
		t.is(Slack.bot.icon, ':robot_face:');
		t.is(Slack.bot.id[0], 'U');
		t.is(Slack.users[Slack.bot.id], Slack.bot.name);
	});
});

// Slack.connect(config.token)
// 	.then(()=>console.log('connected!'))
// 	.then(()=>{
// 		console.log(Slack.users);
// 		console.log(Slack.bots);
// 		console.log(Slack.channels);
// 		console.log(Slack.dms);
// 		console.log(Slack.bot);
// 	})
// 	.then(()=>{
// 		return Slack.msg('general', 'Hey mang');
// 	});



test.group('utils', (test)=>{

});



// Slack.onMessage((msg)=>{
// 	console.log('I got a message', msg);
// 	Slack.react(msg, ':thumbsup:')
// 		.catch((err)=>console.log(err));
// });

// Slack.onReact((reaction)=>{
// 	console.log(reaction);
// });


module.exports = test;