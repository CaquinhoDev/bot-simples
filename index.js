const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const pino = require("pino");

const pairingCode = false;
const NodeCache = require("node-cache");
const msgRetryCounterCache = new NodeCache();

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: !pairingCode,
    qrTimeout: 180000,
    logger: pino({ level: "silent" }),
    browser: ["Chrome (Linux)", "", ""], // If you change this then the pairing code will not work!!!
    msgRetryCounterCache,
    connectTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    emitOwnEvents: true,
    fireInitQueries: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!message?.interactiveMessage;
      if (requiresPatch) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {},
              },
              ...message,
            },
          },
        };
      }
      return message;
    },
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (!pairingCode && qr) {
      console.log(qr);
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "conexão fechada devido a ",
        lastDisconnect.error,
        ", reconectando ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("BOT ONLINE, BOTÕES E LISTAS PRONTOS");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const message = m.messages[0];
    console.log(message);
    const selectedId =
      message?.message?.templateButtonReplyMessage?.selectedId || false;

    const from = message.key.remoteJid;
    const sender = message.key.participant;

    const text =
      message.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
      message.message?.extendedTextMessage?.text;

    // Skip chats
    /* if (from != "DEV_GROUP_JID_HERE") {
              return
          } */

    // for debug
    console.log(JSON.stringify(message, undefined, 2));

    // Comando de envio de botões

    // Comando Ping
    if (text == "/ping") {
      await sock.sendMessage(from, {
        text: "🏓 ᴘᴏɴɢ! ᴏ ʙᴏᴛ ᴇꜱᴛᴀ́ ᴏɴʟɪɴᴇ ᴇ ꜰᴜɴᴄɪᴏɴᴀɴᴅᴏ.",
      });
    }
    // Comando Dono - Envio de Contato
    else if (text === "/dono") {
      // Implementa a lógica para o comando /dono, enviando um contato
      await sock.sendMessage(from, {
        contacts: {
          displayName: "ᴍᴇᴜ ᴅᴏɴᴏ 😎",
          contacts: [
            {
              displayName: "ᴍᴇᴜ ᴅᴏɴᴏ 😎",
              vcard: `BEGIN:VCARD
  VERSION:3.0
  FN:ᴍᴇᴜ ᴅᴏɴᴏ 😎
  TEL;TYPE=CELL;waid=5511913372146:+55 11 91337-2146
  END:VCARD`,
            },
          ],
        },
      });
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Run in main file
connectToWhatsApp();
