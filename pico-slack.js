const request = require('superagent');
const WebSocket = require('ws');
const Events = require('events');
const path = require('path');

let pingTimer;
const startPing = (id = 0)=>{
	if(!Slack.connected) return;
	Slack.socket.send(JSON.stringify({ id, type : 'ping' }));
	pingTimer = setTimeout(()=>startPing(id+1), 5000);
};

const map = (obj, fn)=>Object.keys(obj).map((key)=>fn(obj[key], key));
const findKey = (obj, fn)=>Object.keys(obj).find((key)=>fn(obj[key], key));
const wait = async (n, val)=>new Promise((r)=>setTimeout(()=>r(val), n));
const sequence = async (obj, fn)=>Object.keys(obj).reduce((a, key)=>a.then((r)=>fn(obj[key], key, r)), Promise.resolve());

//https://api.slack.com/methods/rtm.start
const processTeamInfo = (teamInfo)=>{
	Slack.info = teamInfo;
	Slack.bot.id = teamInfo.self.id;

	map(teamInfo.users,   (user)=>{
		if(user.deleted == true || !user.profile) return;
		Slack.users[user.id] = user.name;
		if(user.profile && user.profile.bot_id) Slack.bots[user.profile.bot_id] = user.id;
	});

	map(teamInfo.channels, (channel)=>Slack.channels[channel.id] = channel.name);
	map(teamInfo.groups,   (channel)=>Slack.channels[channel.id] = channel.name);
	map(teamInfo.ims,      (im)=>Slack.dms[Slack.users[im.user]] = im.id);

	if(!findKey(Slack.channels, (name, id)=>name == Slack.log_channel)){
		throw `Could not find the channel to send logs to. Either create '#${Slack.log_channel}' or change the log_channel`;
	}
};

const handleEvent = (rawData, flags)=>{
	try {
		const evt = JSON.parse(rawData);
		if(evt.error) return Slack.error(evt);
		if(evt.type === 'goodbye') return reconnect();
		const event = processEvent(evt);
		if(event.user_id === Slack.bot.id) return;
		Slack.emitter.emit(event.type, event);
	} catch (err){ Slack.error(err); }
};

const processEvent = (event)=>{
	const evt = Object.assign({}, event);
	evt.text = evt.text || '';
	evt.channel_id = event.channel;
	evt.user_id = event.user;
	if(event.bot_id) evt.user_id = Slack.bots[event.bot_id];

	if(event.item && event.item.channel) evt.channel_id = event.item.channel;
	if(evt.channel_id) evt.channel = Slack.channels[evt.channel_id];
	if(evt.user_id) evt.user = Slack.users[evt.user_id];
	if(event.username) evt.user = event.username;
	evt.isPrivate = evt.channel_id && evt.channel_id[0] == 'G';
	evt.isDirect = false;
	if(evt.channel_id && evt.channel_id[0] == 'D'){
		evt.isDirect = true;
		evt.channel = evt.channel_id;
	}
	evt.mentionsBot = evt.isDirect || utils.textHas(evt.text, [Slack.bot.id, Slack.bot.name]);
	return evt;
};

const handleSocketClose = ()=>{
	Slack.connected = false;

	// If the socket disconnects unexpectedly, try to reconnect.
	if (!Slack.closing) reconnect();
	else Slack.closing = false;
};

const reconnect = async ()=>{
	try {
		// Ensure the old socket doesn't keep emitting events once we have a new socket.
		Slack.close();
		await Slack.connect(Slack.token);
	} catch (err) {
		Slack.emitter.emit('error', err);
	}
};

const utils = {
	clean     : (emoji, wrap = ':')=>`${wrap}${emoji.replace(/:/g, '')}${wrap}`,
	getTarget : (target)=>{
		let channel, thread_ts;
		if(typeof target == 'string') channel = Slack.dms[target] || target;
		if(typeof target == 'object'){
			channel = target.channel_id || target.channel;
			thread_ts = (target.message.thread_ts !== target.ts)
				? target.message.thread_ts
				: undefined;
		}
		return { channel, thread_ts };
	},
	textHas : (msg, ...filters)=>{
		if(!msg) return false;
		if(msg.text) msg = msg.text;
		if(typeof msg !== 'string') return false;
		msg = msg.toLowerCase();
		return filters.every((options)=>{
			if(typeof options == 'string') options = [options];
			return !!options.find((opt)=>msg.indexOf(opt.toLowerCase()) !== -1);
		});
	},
	getTraceMessage : (values)=>{
		if(!Array.isArray(values)) values = [values];
		const error = values.find((val)=>val instanceof Error);
		const stackline = (error)
			? error.stack.split('\n')[1]
			: (new Error()).stack.split('\n')[4];

		let name, loc = stackline.replace('at ', '').trim();
		const res = /(.*?) \((.*?)\)/.exec(loc);
		if(res){
			name = res[1];
			loc = res[2];
		}
		const [_, file, line, col] = /(.*?):(\d*):(\d*)/.exec(loc);
		return `${path.relative(process.cwd(), file)}:${line} from ${name}`;
	},
	log : (values = [], opts = {})=>{
		opts = Object.assign({ logger : console.log }, opts);
		const value = (Array.isArray(values) && values.length === 1) ? values[0] : values;
		opts.logger(...values);
		if(!Slack.connected) return;
		if(!opts.footer) opts.footer = utils.getTraceMessage(values);

		return Slack.api('chat.postMessage', {
			channel     : Slack.log_channel,
			username    : Slack.bot.name,
			icon_emoji  : utils.clean(Slack.bot.icon),
			attachments : [{
				color     : opts.color,
				text      : `\`\`\`${JSON.stringify(value, null, '  ')}\`\`\``,
				mrkdwn_in : ['text'],
				footer    : opts.footer,
			}],
		}).catch(()=>{});
	},
};

const Slack = {
	utils,

	connected   : false,
	closing     : false,
	token       : '',
	socket      : null,
	log_channel : 'diagnostics',
	channels    : {},
	users       : {},
	bots        : {},
	dms         : {},
	bot         : {
		id   : '',
		name : 'bot',
		icon : ':robot_face:',
	},
	has     : utils.textHas,
	emitter : new Events(),

	onMessage : (handler)=>Slack.emitter.on('message', handler),
	onReact   : (handler)=>Slack.emitter.on('reaction_added', handler),
	onConnect : (handler)=>{
		if(Slack.connected) handler();
		return Slack.emitter.on('connect', handler);
	},
	onChannelMessage : (channel, handler)=>{
		Slack.emitter.on('message', (event)=>event.channel === channel && handler(event));
	},
	onError : (handler)=>Slack.emitter.on('error', handler),
	onEvent : (eventType, handler)=>Slack.emitter.on(eventType, handler),

	connect : async (token)=>{
		Slack.token = token;
		return Slack.api('rtm.start')
			.then((data)=>{
				return new Promise((resolve, reject)=>{
					if(!data.ok || !data.url) return reject(`bad access token`);
					processTeamInfo(data);
					Slack.socket = new WebSocket(data.url);
					Slack.socket.on('open', resolve);
					Slack.socket.on('message', handleEvent);
					Slack.socket.on('close', handleSocketClose);
					Slack.socket.on('error', (err)=>Slack.emitter.emit('error', err));
				});
			})
			.then(()=>{
				Slack.connected = true;
				Slack.emitter.emit('connect');
				startPing();
			});
	},
	close : ()=>{
		if (Slack.socket.readyState === WebSocket.CLOSED) return;

		Slack.closing = true;
		Slack.socket.close();
	},
	api : async (method, payload = {})=>{
		if(payload.attachments) payload.attachments = JSON.stringify(payload.attachments);
		return new Promise((resolve, reject)=>{
			request.get(`https://slack.com/api/${method}`)
				.query({ token : Slack.token, ...payload })
				.end((err, res)=>{
					if(err || (res.body && res.body.ok === false)) return reject(err || res.body.error);
					return resolve(res.body);
				});
		});
	},
	alias : (username, icon_emoji)=>{
		return {
			...Slack,
			send   : (target, text, opts)=>Slack.send(target, text, { ...opts, username, icon_emoji }),
			thread : (target, text, opts)=>Slack.thread(target, text, { ...opts, username, icon_emoji }),
		};
	},
	send : async (target, text, opts = {})=>{
		return Slack.api('chat.postMessage', {
			...utils.getTarget(target),
			...opts,
			text,
			username   : opts.username || Slack.bot.name,
			icon_emoji : utils.clean(opts.icon_emoji || Slack.bot.icon),
		});
	},
	thread : async (event, text, opts = {})=>{
		if(!event.thread_ts && !event.ts) throw `Can not start thread from event`;
		return Slack.send(event.channel, text, {
			...opts,
			thread_ts : event.thread_ts || event.ts,
		});
	},
	react : async (event, emoji)=>{
		if(!event.ts) throw `Can not react to this event`;
		if(Array.isArray(emoji)) return sequence(emoji, (icon)=>Slack.react(event, icon).then(()=>wait(300)));
		return Slack.api('reactions.add', {
			channel   : event.channel_id || event.channel,
			name      : utils.clean(emoji, ''),
			timestamp : event.ts,
		});
	},
	log   : (...args)=>utils.log(args, { color : 'good' }),
	warn  : (...args)=>utils.log(args, { color : 'warning', logger : console.warn }),
	error : (...errs)=>utils.log(errs, { color : 'danger', logger : console.error }),
};

/** Aliases **/
Slack.onMsg = Slack.onMessage;
Slack.onChannelMsg = Slack.onChannelMessage;

module.exports = Slack;
