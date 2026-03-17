const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- MANTER ONLINE NA RENDER ---
http.createServer((req, res) => {
  res.write('VOLX BOT ONLINE');
  res.end();
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- CARREGAR DADOS ---
const loadJSON = (file, def) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def;
let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, []);

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// --- FUNÇÃO /MODSGROUP (PARA GRUPOS) ---
bot.command('modsgroup', async (ctx) => {
    // Verifica se é um grupo ou supergrupo
    if (ctx.chat.type === 'private') {
        return ctx.reply("❌ Este comando deve ser usado em um grupo.");
    }

    // Verifica se o bot é ADM do grupo
    const botMember = await ctx.getChatMember(ctx.botInfo.id);
    if (botMember.status !== 'administrator') {
        return ctx.reply("⚠️ Preciso ser Administrador do grupo para funcionar corretamente!");
    }

    if (mods.length === 0) return ctx.reply("📦 Nenhum mod disponível no momento.");

    let msg = `📦 *CATÁLOGO DE MODS*\nSolicitado por: [${ctx.from.first_name}](tg://user?id=${ctx.from.id})\n\n`;
    mods.forEach(m => msg += `🔹 *${m.description}*\nCódigo: \`${m.id}\`\n\n`);

    // Responde marcando a pessoa (reply)
    ctx.reply(msg, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

// --- REGISTRO NO START ---
bot.start((ctx) => {
    const id = ctx.from.id;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        save();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*`, { parse_mode: 'Markdown' });
});

// --- COMANDOS DE ADMIN E MODERAÇÃO ---
// (Mantenha os comandos /ban, /castigo, /delmod e /enviar que já enviamos antes)

bot.command(['mods', 'att'], (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("Use /modsgroup neste grupo.");
    if (mods.length === 0) return ctx.reply("📦 Sem mods.");
    let msg = "📦 *CATÁLOGO DE MODS*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nCódigo: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Entrega automática por código
bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const mod = mods.find(m => m.id === ctx.message.text.toUpperCase());
    if (!mod) return;
    if (mod.type === 'file') {
        ctx.replyWithDocument(mod.content, { caption: `✅ Mod: ${mod.description}` }).catch(() => {});
    } else {
        ctx.reply(`🔗 *Link:* ${mod.content}`).catch(() => {});
    }
});

bot.launch().then(() => console.log("🚀 VOLX ONLINE COM SUPORTE A GRUPOS!"));

