const request = require('superagent');
const _ = require('lodash');
const path = require('path');
const WebSocket = require('ws');
const Events = require('events');

let socket;

const processTeamData = (teamData)=>{
	Slack.bot.id = teamData.self.id;
	_.each(teamData.channels, (channel)=>{ Slack.channels[channel.id] = channel.name; });
	_.each(teamData.groups,   (channel)=>{ Slack.channels[channel.id] = channel.name; });
	_.each(teamData.users,    (user)   =>{
		Slack.users[user.id] = user.name;
		if(user.profile && user.profile.bot_id) Slack.bots[user.profile.bot_id] = user.id;
	});
	_.each(teamData.ims,(im)=>{ Slack.dms[im.id] = Slack.users[im.user]});
};

const processIncomingEvent = (msg)=>{
	const res = _.assign({}, msg);
	res.text = res.text || "";
	res.channel_id = msg.channel;
	res.user_id = msg.user;
	if(msg.bot_id) res.user_id = Slack.bots[msg.bot_id];

	//For reactions
	if(msg.item && msg.item.channel) res.channel_id = msg.item.channel;

	if(res.channel_id) res.channel = Slack.channels[res.channel_id];
	if(res.user_id) res.user = Slack.users[res.user_id];
	if(msg.username) res.user = msg.username;
	if(res.channel_id && res.channel_id[0] == 'D'){
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
		username   : Slack.bot.name,
		icon_emoji : Slack.bot.icon,
		attachments: JSON.stringify([{
			color     : color,
			text      : '```' + text + '```',
			mrkdwn_in : ['text'],
			footer : `${fileName}:${lineNumber}`
		}])
	}).catch(()=>{})
};

const Slack = {
	connected : false,
	token : '',
	log_channel : 'diagnostics',
	channels : {},
	users    : {},
	bots     : {},
	dms      : {},
	bot : {
		id : '',
		name : 'bot',
		icon : ':robot_face:'
	},
	setInfo : (name, icon)=>{
		Slack.bot.name = name;
		Slack.bot.icon = `:${_.replace(icon, /:/g, '')}:`
	},
	connect : (token)=>{
		Slack.token = token;
		return Slack.api('rtm.start')
			.then((data) => {
				return new Promise((resolve, reject)=>{
					if (!data.ok || !data.url) return reject(`bad access token`);
					processTeamData(data);
					socket = new WebSocket(data.url);

					socket.on('open', resolve);
					socket.on('message', (rawData, flags) => {
						const message = processIncomingEvent(JSON.parse(rawData));
						if(message.user_id === Slack.bot.id) return;
						Slack.emitter.emit(message.type, message);
					});
				});
			})
			.then(()=>Slack.connected = true)
	},
	close : ()=>new Promise((resolve, reject)=>socket.close(()=>resolve())),
	api : (command, payload) => {
		return new Promise((resolve, reject)=>{
			request
				.get(`https://slack.com/api/${command}`)
				.query(_.assign(payload, { token : Slack.token }))
				.end((err, res)=>{
					if(err || (res.body && res.body.ok === false)) return reject(err || res.body.error);
					return resolve(res.body);
				});
		});
	},
	msg : (target, text, opts)=>{
		const dm = _.findKey(Slack.dms, (user)=>target == user);
		return Slack.api('chat.postMessage', _.assign({
			channel    : (dm || target),
			text       : text,
			username   : Slack.bot.name,
			icon_emoji : Slack.bot.icon
		}, opts))
	},
	msgAs : (botname, boticon, target, text)=>Slack.msg(target, text, {username: botname, icon_emoji:boticon}),
	react : (msg, emoji)=>{
		return Slack.api('reactions.add', {
			channel   : msg.channel_id || msg.channel,
			name      : _.replace(emoji, /:/g, ''),
			timestamp : msg.ts
		});
	},

	emitter : new Events(),
	onMessage : (handler)=>Slack.emitter.on('message', handler),
	onReact : (handler)=>Slack.emitter.on('reaction_added', handler),

	log : log.bind(null, ''),
	debug: log.bind(null, '#3498db'),
	info : log.bind(null, 'good'),
	warn : log.bind(null, 'warning'),
	error : log.bind(null, 'danger'),

	//Utils
	msgHas : (msg, ...filters)=>{
		if(!msg) return false;
		msg = msg.toLowerCase();
		return _.every(filters, (opts)=>{
			if(_.isString(opts)) opts = [opts];
			return _.some(opts, (opt)=>msg.indexOf(opt.toLowerCase()) !== -1)
		});
	},
}
module.exports = Slack;
