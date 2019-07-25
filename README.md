# 💬 pico-slack

[![NPM](https://nodei.co/npm/pico-slack.png)](https://nodei.co/npm/pico-slack/)

An incredibly tiny Slack bot library



## install

```
npm install pico-slack
```



## usage
```js
const Slack = require('pico-slack');

Slack.bot.name = 'greetingsbot';
Slack.bot.icon = 'wave';

Slack.connect('xoxb-00000000000-xxxxxxxxxxxxxxxxxxxx')
  .then(()=>Slack.send('general', 'hello world!'))

Slack.onMessage((msg)=>{
  if(Slack.msgHas(msg.text, ['hey', 'hello'])){
    Slack.react(msg, 'wave');
    Slack.thread(msg, `Right back at you ${msg.user}!`);
  }
});
```



## features
- simple interface for receiving and sending messages, adding reactions, and starting threads.
- processes all slack events to be easier to use, reflects them on node event mitters
- handles all ping events and keeping the connection alive
- simplifies interface to the most common slack tasks
- provides advanced error reporting and logging right into slack with smart stack traces
- comes with an optional [bot loader](#bot_loader) to easily load in several bot scripts
- **under 250 lines!**




# api


## lifecycle
#### `.connect(slack_bot_token)`
Creates a web socket connection with Slack using the provided token. On connect, `pico-slack` will parse and store all team data, see "info". The `slack_token` will be stored and automatically attached to any API calls. Any events from Slack will be emitted using the `.emitter`.

#### `.close()`
Closes the socket.


## interaction
#### `.send(target, text, [opts])`
Sends a message of `text` to the `target`. The `target` can be username, user id, channel name, channel id, or event object. If the event object is in a thread, it will message in that thread.

It uses the [`chat.postMessage`](https://api.slack.com/methods/chat.postMessage) Slack API call, and will pass any `opts` through to that call, including [attachments](https://api.slack.com/docs/message-attachments), custom usernames and icons.

```js
Slack.onMessage((msg)=>{
  Slack.send(msg, 'yo!'); //Sends to the same channel as the incoming message

  Slack.send('cool-things-channel', 'complex message', {
    attachments : [{
      "color": "#2eb886",
      "fields": [
        {
          "title": "Priority",
          "value": "High",
          "short": false
        }
      ],
    }]
  });
});
```

#### `.thread(event, text, [opts])`
Starts, or continues, a thread on the `event` with a message of `text`.

It uses the [`chat.postMessage`](https://api.slack.com/methods/chat.postMessage) Slack API call, and will pass any `opts` through to that call, including [attachments](https://api.slack.com/docs/message-attachments), custom usernames and icons.

```js
Slack.onMessage((msg)=>{
  if(Slack.has(msg, 'start a thread here!')){
    Slack.thread(msg, 'can do!');
  }
});
```
#### `.react(event, emoji/emojis)`
Reacts to an event with the provided `emoji`. The `emoji` can be wrapped in `:` or not, eg. `:wave:`. If given an array of `emojis`, it will call `.react` on each with a small delay between calls to ensure the order in which the emojis were given is ensured.

```js
const movieVote = async (movieName)=>{
  return Slack.send('general', `What did everyone think of ${movieName}?`)
    .then((movieMsg)=>{
      return Slack.react(movieMsg, ['thumbsdown', ':thumbsup:', ':fire:'])
    })
}

Slack.onMessage((msg)=>{
  if(Slack.has(msg, ['turtle', 'slow'])){
    Slack.react(msg, 'turtle');
  }
});
```




## events


#### event object
The event object is generated from [Slack's RTM events](https://api.slack.com/events/message) and passed to `pico-slack`'s event emitter. All event hanlders will receive an object that has a similar structure. The library does a fair bit of processing to make the data much easier to use. Here's what an event object looks like:

```js
{
  type        : 'message',
  text        : 'test message',

  user        : 'scott',
  user_id     : 'U0VL783MX',
  channel     : 'general',
  channel_id  : 'C0VL784KT',

  event_ts    : '1564019772.001300',
  ts          : '1564019772.001300',
  team        : 'T0VKSC1BN',

  mentionsBot : false,  //true if the event is in a DM with the bot, or mentions the bot's name
  isDirect    : false,  //true if the event is in a DM
};
```

#### `.onConnect(handler)`
Create a handler for when `pico-slack` connects/reconnects. If `pico-slack` is already connected when `.onConnect()` is called the `hanlder` will be fired immediately.

```js
Slack.onConnect(()=>Slack.log('I am alive!!'));
```

#### `.onMessage(handler)`
Creates a handler for all `message` events. Most common way to interact with `pico-slack`.

```js
Slack.onMessage((msg)=>{
  if(Slack.has(msg, ['turtle', 'slow'])){
    Slack.react(msg, 'turtle');
  }
});
```

#### `.onReact(handler)`
Creates a handler for all `reaction_added` events. If you also want to listen for when reactions are removed, create a custom event handler: `.onEvent('reaction_removed', ()=>{})`.

```js
Slack.onReact((event)=>{
  if(event.reaction === 'ice_cream'){
    Slack.send(event, 'Yes please!');
  }
});
```

#### `.onChannelMessage(channel_name, handler)`
Same as `.onMessage()` but only fires for specific channels.

```js
Slack.onChannelMessage('super-secret', (event)=>{
  Slack.react(event, 'shushing_face');
});
```

#### `.onEvent(event_name, handler)`
Creates a handler for **any** [Slack event](https://api.slack.com/events).

```js
Slack.onEvent('user_typing', (event)=>{
  Slack.send(event, `Watcha typing ${event.user}???`);
});
```

#### `.emitter`
Direct access to `pico-slack`'s [Event Emitter](https://nodejs.org/api/events.html). Useful if you need to bump the the max number of listeners or do more interesting things.

```js
Slack.emitter.setMaxListeners(9000);
```


## info
When `pico-slack` connects, Slack returns a massive dump of all the team information. `pico-slack` processes this information and attaches the extracts the most useful bits. Here's an example:

```js
Slack.connected = true
Slack.info = {], // Raw dump of all Slack team info
Slack.channels = {
   C0VL2BUUX: 'diagnostics',
   C0VL784KT: 'general',
}
Slack.users = {
   U0VKSFTB6: 'higgins',
   U0VL783MX: 'scott'
}
Slack.bots = {
   B0VKVBSQ6: 'U0VKSFTB6',
}
Slack.dms = {
   scott: 'D0VKSFTBN',
   slackbot: 'D0VLD2KGA'
}
Slack.bot = {
   id: 'U0VKSFTB6',
   name: 'higgins',
   icon: ':robot_face:'
}
```

#### `.bot`
Your bot information is stored on the `.bot` object. If you want to change the name of your bot or it's icon, you can simply overwrite the values there

```js
Slack.bot.name = 'butlerbot';
Slack.bot.icon = 'top_hat';
```

#### `.log_channel`
`pico-slack` uses the channel name stored at `.log_channel` to determine where to write it's log messags to. You can overwrite this value to change that channel.

```js
Slack.log_channel = 'bot_noise';
```


## utils

#### `.has(text/event, ...filters)`

Checks if the given `text` (or text on the `event`) passes the `filters`. The `filters` can be any number of strings or array of strings. The text must have a substring from each parameter, or at least of one them if it's an array. Case-insenstive.

This is very useful for picking up on various

```js

Slack.has('Hey cool guy', ['greetings', /* OR */ 'hey'], /* AND */ 'cool guy') == true

Slack.has('Hey there!', 'hey') == true //case insensitive

Slack.onMessage((event)=>{
  if(Slack.has(event, ['get', 'grab', 'pick up'], ['lunch', 'food', 'grub'])){
    /* Matches:
      'hey, wanna grab some grub?'
      'Anyone want to pick up some lunch?'
      'FOOD! ME GET FOOD!'
    */
  }
})
```

### `.api(method, arguments)`
Direct access to [Slack's API](https://api.slack.com/methods). Automatically applies the Slack token to the query.

```js
Slack.api('channels.history', { channel : 'C0VL784KT', count : 5})
  .then((result)=>{
    //Fetches the 5 most recent messages from the channel
  });
```

#### `.alias(bot_name, icon_emoji)` -> pico-slack instance
Returns an aliased instance with a different bot name and icon. Useful for making multi-bots that have different identities.

```js
const TriviaBot = Slack.alias('triviabot', 'dice');

TriviaBot.onMessage((msg)=>{
  TriviaBot.send(msg, 'Hey!');
});
```

#### `.log(...values)`
`pico-slack` comes with a pretty useful logging engine. If your bot is connected, when you call `Slack.log(args)` it will log to the console, but it will also log a slack message to the channel defined at `Slack.log_channel`. This log message is code formatted and `pico-slack` runs a trace to give you the file name, line number and function name where the log originated from in the footer of the message.

If any of the `values` are `Error` objects, it will instead use their stack trace for the footer information.

#### `.error(...args)`
Exact same as `.log()` except it uses `console.error()` instead of `console.log()` and colors the slack message red.



## bot loader
One of the most common ways to use `pico-slack` is to set up a "multi-bot". A single slack bot for your team but each of it's functions are separated into smaller micro-bots.

This is very useful if you want to make something simple, like a bot to check if a website it up and message a channel if it's not. A person on your team can add a `uptime.bot.js` to your bot witha  small script and you are good to go.

What does the bot loader do:
- Iterates through a folder and all sub-folders to find all files named `*.bot.js`.
- `require`s and loads them. If any experience errors of syntax issues, they will be caught and logged with `.error()`
- returns an array with an object for each bot; it's name, path, return value and/or error objects.
- sets up listeners for `unhandledRejection` and `uncaughtException`, and will log them with stack traces.

```js
const Slack = require('pico-slack');
const BotLoader = require('pico-slack/bot-loader.js');


Slack.connect()
  .then(()=>Botloader('./bots'))
  .then((bots)=>{
    console.log(bots);
  })
```
