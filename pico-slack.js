const request = require('superagent');
const _ = require('lodash');
const path = require('path');
const WebSocket = require('ws');
const Events = require('events');

let socket;

const processTeamData = (teamData)=>{
	const bot = _.find(teamData.users, (user)=>user.id == teamData.self.id);
	if(bot) Slack.botId = bot.profile.bot_id;

	_.each(teamData.channels, (channel)=>{ Slack.channels[channel.id] = channel.name; });
	_.each(teamData.groups,   (channel)=>{ Slack.channels[channel.id] = channel.name; });
	_.each(teamData.users,    (user)   =>{ Slack.users[user.id] = user.name; });
	_.each(teamData.ims,      (im)     =>{ Slack.dms[im.id] = Slack.users[im.user]});
};

const processIncomingEvent = (msg)=>{
	const res = _.assign({}, msg);

	res.text = res.text || "";
	res.channelId = msg.channel;
	res.userId = msg.user || msg.bot_id;

	//For reactions
	if(msg.item && msg.item.channel) res.channelId = msg.item.channel;

	if(res.channelId) res.channel = Slack.channels[res.channelId];
	if(res.userId) res.user = Slack.users[res.userId];
	if(msg.username) res.user = msg.username;
	if(res.channelId && res.channelId[0] == 'D'){
		res.isDirect = true;
		res.channel = 'direct';
	}
	return res;
};

const log = (color, ...args)=>{
	console.log(...args);
	if(!Slack.connected) return;
	Error.prepareStackTrace = (err, stack)=>stack;
	const caller = (new Error()).stack[1];
	const fileName = path.relative(process.cwd(), caller.getFileName());
	const lineNumber = caller.getLineNumber();

	const text = _.map(args, (arg)=>{
		if(arg instanceof Error) return arg.toString();
		return JSON.stringify(arg, null, '  ')
	}).join(', ');

	return Slack.api('chat.postMessage', {
		channel    : Slack.log_channel,
		username   : Slack.botInfo.name,
		icon_emoji : Slack.botInfo.icon,
		attachments: JSON.stringify([{
			color     : color,
			text      : '```' + text + '```',
			mrkdwn_in : ['text'],
			footer : `${fileName}:${lineNumber}`
		}])
	}).catch(()=>{})
}

const Slack = {
	connected : false,

	channels : {},
	users    : {},
	dms      : {},

	log_channel : 'diagnostics',

	botId    : '',
	token : '',
	botInfo : {
		name : 'bot',
		icon :':robot:'
	},

	connect : (token, botInfo)=>{
		Slack.token = token;
		Slack.botInfo = botInfo;

		return Slack.api('rtm.start')
			.then((data) => {
				return new Promise((resolve, reject)=>{
					if (!data.ok || !data.url) return reject(`bad access token`);
					processTeamData(data);
					socket = new WebSocket(data.url);

					socket.on('open', resolve);
					socket.on('message', (rawData, flags) => {
						const msg = JSON.parse(rawData);
						if(msg.bot_id === Slack.botId) return;
						const message = processIncomingEvent(msg);
						if(message.type == 'message') console.log(message);
						emitter.emit(message.type, message);
					});
				});
			})
			.then(()=>Slack.connected = true)
	},

	api : (command, payload) => {
		return new Promise((resolve, reject)=>{
			request
				.get(`https://slack.com/api/${command}`)
				.query(_.assign({}, payload, { token : Slack.token }))
				.end((err, res)=>{
					if(err || res.body && res.body.ok === false) return reject(err || res.body.error);
					return resolve(res.body);
				});
		});
	},

	sendAs : (name, icon)=>{
		return (target, text, opts)=>{
			return Slack.msg(target, text, _.assign({
				username   : name,
				icon_emoji : icon
			}, opts));
		}
	},
	msg : (target, text, opts)=>{
		const dm = _.findKey(Slack.dms, (user)=>target == user);
		return Slack.api('chat.postMessage', _.assign({
			channel    : (dm || target),
			text       : text,
			username   : Slack.botInfo.name,
			icon_emoji : Slack.botInfo.icon
		}, opts)
	},
	react : (msg, emoji)=>{
		return Slack.api('reactions.add', {
			channel   : msg.channelId || msg.channel,
			name      : emoji,
			timestamp : msg.ts
		});
	},

	emitter : new Events(),
	onMessage : (handler)=>Slack.emitter.on('message', handler),
	onReaction : (handler)=>Slack.emitter.on('reaction_added', handler),

	log : log.bind(null, ''),
	info : log.bind(null, 'good'),
	warn : log.bind(null, 'warning'),
	error : log.bind(null, 'danger'),
}


module.exports = Slack;
