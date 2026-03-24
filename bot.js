aconst TeleBot = require('telebot');
const fs = require('fs');

const TOKEN = '7629557685:AAF8M1A5-uU-yX6_F6W6Y5M8Z7X9Y4M3X1';
const OWNER_ID = 6365451230;

const bot = new TeleBot(TOKEN);

// --- BANCO DE DADOS ---
let db = { users: [], groups: [] };
if (fs.existsSync('users_db.json')) {
    db = JSON.parse(fs.readFileSync('users_db.json'));
}

function saveDb() {
    fs.writeFileSync('users_db.json', JSON.stringify(db, null, 2));
}

function temAcesso(id) {
    return id === OWNER_ID || db.users.some(u => u.id === id);
}

// --- FILTRO DE SEGURANÇA (MATA O LOOP) ---
bot.on('*', (msg) => {
    const uid = msg.from.id;
    if (!temAcesso(uid)) {
        if (msg.text && msg.text.startsWith('/start')) {
            return bot.sendMessage(uid, "❌ **ACESSO NEGADO.**\nFale com @Volxcheatsofc.");
        }
        return; 
    }
});

// --- COMANDOS ---
bot.on('/start', (msg) => bot.sendMessage(msg.from.id, "🚀 **BOT VOLX ONLINE!**"));

bot.on('/id', (msg) => bot.sendMessage(msg.from.id, `🆔 Seu ID: \`${msg.from.id}\``, {parseMode: 'Markdown'}));

bot.on('/mods', (msg) => {
    let m = "📂 **MODS VOLX:**\n\n• Regedit Mobile\n• Aimlock No Recoil\n• Painel v2";
    return bot.sendMessage(msg.from.id, m, {parseMode: 'Markdown'});
});

// --- COMANDOS ADMIN ---
bot.on(/^\/add (.+)$/, (msg, props) => {
    if (msg.from.id !== OWNER_ID) return;
    const newId = parseInt(props.match[1]);
    if (!db.users.some(u => u.id === newId)) {
        db.users.push({ id: newId, wins: 0 });
        saveDb();
        return bot.sendMessage(OWNER_ID, `✅ User ${newId} Adicionado!`);
    }
});

bot.on('/avisogroups', (msg) => {
    if (msg.from.id !== OWNER_ID) return;
    const aviso = msg.text.split(' ').slice(1).join(' ');
    if (!aviso) return bot.sendMessage(OWNER_ID, "Use: /avisogroups [mensagem]");
    
    db.groups.forEach(groupId => {
        bot.sendMessage(groupId, `📢 **AVISO IMPORTANTE:**\n\n${aviso}`, {parseMode: 'Markdown'}).catch(e => console.log("Erro no grupo: " + groupId));
    });
    return bot.sendMessage(OWNER_ID, "✅ Aviso enviado aos grupos!");
});

// Registrar grupos automaticamente
bot.on('groupChatCreated', (msg) => {
    if (!db.groups.includes(msg.chat.id)) {
        db.groups.push(msg.chat.id);
        saveDb();
    }
});

bot.start();

