const { EventEmitter } = require("events");

const messageHub = new EventEmitter();
messageHub.setMaxListeners(0);

const emitMessage = (message) => {
  messageHub.emit(`user:${message.receiverId}`, message);
};

module.exports = { messageHub, emitMessage };
