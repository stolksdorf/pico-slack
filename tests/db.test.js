const _ = require('lodash');
const test = require('ava');

const db = require('../server/db.js');

const loc = {
	t1 : { lat : 43.987031, lon: -80.438622 },
	t2 : { lat : 43.987039, lon: -80.435339 },
	t3 : { lat : 43.984599, lon : -80.435007}
};

const msgA = ()=>db.storeMessage('userA', loc.t1, ['userB', 'userC'], 'Test Message');
const msgB = ()=>db.storeMessage('userA', loc.t2, ['userC'], 'Not for B');
const msgC = ()=>db.storeMessage('userA', loc.t3, ['userB'], 'Cool stuff yo');


test.before(()=>db.connect());
test.before(()=>db.clear());


test.serial('Store a single message', (t)=>{
	let text;
	return msgA()
		.then((msg)=>{
			console.log('msg', msg);
			text = msg.text;
			return db.getMessagesForUser('userB')
		})
		.then((msgs)=>{
			t.is(msgs[0].text, text);
		});
});


test.serial('Should only get one user', (t)=>{
	let text;
	return Promise.resolve()
		.then(msgB)
		.then(msgC)
		.then(()=>db.getMessagesForUser('userB'))
		.then((msgs)=>{
			t.is(msgs.length, 2)
		});
});

test.serial('Should only get close messages', (t)=>{
	return db.getNearbyMessagesForUser('userB', loc.t3, 30)
		.then((msgs)=>{
			t.is(msgs.length, 1)
		})
});


test.serial('Remove a user from recipient', (t)=>{
	let count;
	return db.getMessagesForUser('userB')
		.then((msgs) => {
			count = msgs.length;
			return db.removeUserFromMessage(msgs[0], 'userB')
		})
		.then(()=>db.getMessagesForUser('userB'))
		.then((msgs)=>{
			t.is(msgs.length, count - 1)
		})
});

test.serial('if last recipients removed, delete record', (t)=>{
	return db.storeMessage('userA', loc.t3, ['userX'], 'remove it')
		.then((msg)=>db.removeUserFromMessage(msg, 'userX'))
		.then(()=>db.getMessagesForUser('userX'))
		.then((msgs)=>{
			t.is(msgs.length, 0)
		});
});


test.serial('should get all messages', (t)=>{

	db.getAll()
		.then((msgs)=>console.log(msgs))

	t.pass();


});
