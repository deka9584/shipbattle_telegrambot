const { Telegraf, Markup } = require("telegraf");
const WebSocket = require("ws");
const { token, serverAddress } = require("./config.json");

const bot = new Telegraf(token);
let wsClient;

const connect = () => {
    wsClient = new WebSocket(serverAddress);
    wsClient.addEventListener("message", wsClient_messageHandler);
}

const sendToServer = (data) => {
    data.source = "bot";

    if (wsClient?.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify(data));
    }
    else {
        console.error("Connection failed:", wsClient);
        connect();
        console.warn("Reconnecting:", wsClient?.readyState);
        wsClient?.once("open", () => {
            wsClient.send(JSON.stringify(data));
        });
    }
}

const sendPlayMessage = (chatId, roomId) => {
    const link = `http://127.0.0.1:5500/?room=${roomId}&chatId=${chatId}`;
    const message = `Qualcuno vuole giocare a Battaglia Navale? <a href="${link}">Clicca qui</a>`;
    bot.telegram.sendMessage(chatId, message, { parse_mode: "HTML" });
}

const wsClient_messageHandler = (event) => {
    const messageData = JSON.parse(event.data);

    switch (messageData.type) {
        case "room-created":
            sendPlayMessage(messageData.chatId, messageData.roomId);
            break;
    }
}

bot.command("play", ctx => {
    const data = {
        chatId: ctx.chat.id,
        type: "create-room",
    };

    sendToServer(data);
});

bot.command("quit", ctx => {
    if (ctx.chat.type !== "private") {
        ctx.leaveChat();
    }
});

bot.help(ctx => {
    ctx.reply("Invia /start per ricevere un saluto");
    ctx.reply("Invia /play per iniziare una nuova partita");
    ctx.reply("Invia /quit per rimuovere il bot dalla chat");
});

bot.start(ctx => {
    ctx.reply(`Ciao ${ctx.from.first_name}!\n\nInvia /help per la lista dei comandi`);
});

process.once("SIGINT", event => {
    bot.stop("SIGINT");
    console.log(event);
});

process.once("SIGTERM", event => {
    bot.stop("SIGTERM");
    console.log(event);
});

connect();
bot.launch();
sendToServer({ message: "bot-start" });