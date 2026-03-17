aconst { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// --- MANTER ONLINE NA RENDER ---
http.createServer((req, res) => {
  res.write('VOLX BOT ONLINE');
  res.end();
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const MODS_FILE = 'mods_db.json';
const DB_FILE = 'users_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- BANCO DE DADOS (CARREGAMENTO SEGURO) ---
const loadJSON = (file, def) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def;
let mods = loadJSON(MODS_FILE, []);
let users = loadJSON(DB_FILE, {});
let admins = loadJSON(ADMINS_FILE, []);

const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- MIDDLEWARE DE PROTEÇÃO (BAN E CASTIGO) ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    if (!id) return next();
    if (users[id]?.banido) return; 
    if (users[id]?.castigo && users[id].castigo > Date.now()) {
        const resto = Math.round((users[id].castigo - Date.now()) / 60000);
        return ctx.reply(`⏳ Você está de castigo! Faltam ${resto} min.`).catch(() => {});
    }
    return next();
});

// --- COMANDOS DE DONO (MODERAÇÃO) ---
bot.command('ban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target || !users[target]) return ctx.reply("❌ Use: /ban [ID]");
    users[target].banido = true;
    save(DB_FILE, users);
    ctx.reply(`🚫 Usuário ${target} banido.`);
});

bot.command('unban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target || !users[target]) return ctx.reply("❌ Use: /unban [ID]");
    users[target].banido = false;
    save(DB_FILE, users);
    ctx.reply(`✅ Usuário ${target} desbanido.`);
});

bot.command('castigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.payload.split(' ');
    const id = args[0];
    const min = args[1];
    if (!id || !min) return ctx.reply("❌ Use: /castigo [ID] [MINUTOS]");
    if (!users[id]) users[id] = { nome: "User", ind: 0 };
    users[id].castigo = Date.now() + (parseInt(min) * 60000);
    save(DB_FILE, users);
    ctx.reply(`🔇 Usuário ${id} em silêncio por ${min} min.`);
});

bot.command('uncastigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = ctx.payload;
    if (!target || !users[target]) return ctx.reply("❌ Use: /uncastigo [ID]");
    users[target].castigo = 0;
    save(DB_FILE, users);
    ctx.reply(`🔊 Castigo removido.`);
});

// --- COMANDOS DE ADMIN / DONO ---
bot.command('delmod', (ctx) => {
    if (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) return;
    const modId = ctx.payload.toUpperCase().trim();
    if (!modId) return ctx.reply("❌ Use: /delmod [CÓDIGO]");
    const index = mods.findIndex(m => m.id === modId);
    if (index > -1) {
        mods.splice(index, 1);
        save(MODS_FILE, mods);
        ctx.reply(`🗑️ Mod \`${modId}\` removido.`);
    } else {
        ctx.reply("❌ Não encontrado.");
    }
});

bot.command('aviso', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Use: /aviso [texto]");
    const allUsers = Object.keys(users);
    ctx.reply(`📢 Enviando para ${allUsers.length} pessoas...`);
    for (const id of allUsers) {
        bot.telegram.sendMessage(id, `📢 *AVISO VOLX CHEATS*\n\n${msg}`, { parse_mode: 'Markdown' }).catch(() => {});
    }
});

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id !== OWNER_ID && !admins.includes(id)) return;
    let menu = `👑 *PAINEL VOLX*\n\n/enviar - Add mod\n/users - Ver IDs\n/delmod [ID] - Deletar\n`;
    if (id === OWNER_ID) {
        menu += `\n🛡️ *DONO*\n/ban /unban [ID]\n/castigo /uncastigo [ID] [min]\n/aviso [texto]\n/admin /unadmin [ID]`;
    }
    ctx.reply(menu, { parse_mode: 'Markdown' });
});

bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (!target) return ctx.reply("❌ Use: /admin [ID]");
    if (!admins.includes(target)) { admins.push(target); save(ADMINS_FILE, admins); ctx.reply(`✅ ${target} agora é ADMIN.`); }
});

bot.command('unadmin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    admins = admins.filter(id => id !== target);
    save(ADMINS_FILE, admins);
    ctx.reply(`❌ ${target} removido.`);
});

// --- COMANDOS PÚBLICOS ---
bot.start((ctx) => {
    const id = ctx.from.id;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        save(DB_FILE, users);
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*`, { parse_mode: 'Markdown' }).catch(() => {});
});

bot.command(['mods', 'att'], (ctx) => {
    if (mods.length === 0) return ctx.reply("📦 Sem mods.");
    let msg = "📦 *CATÁLOGO DE MODS*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nID: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' }).catch(() => {});
});

bot.command('users', (ctx) => {
    if (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) return;
    let msg = "👥 *USUÁRIOS*\n\n";
    Object.entries(users).forEach(([id, u]) => { msg += `👤 ${u.nome} | ID: \`${id}\` | Refs: ${u.ind}\n`; });
    ctx.reply(msg, { parse_mode: 'Markdown' }).catch(() => {});
});

// Entrega automática
bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const mod = mods.find(m => m.id === ctx.message.text.toUpperCase());
    if (!mod) return;
    if (mod.type === 'file') {
        ctx.replyWithDocument(mod.content, { caption: `✅ Mod: ${mod.description}` }).catch(() => {});
    } else {
        ctx.reply(`🔗 *Link:* ${mod.content}`).catch(() => {});
    }
});

// Lógica /enviar
bot.on(['document', 'video', 'audio', 'text'], async (ctx, next) => {
    if (!ctx.session || (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) || ctx.message.text?.startsWith('/')) return next();
    if (ctx.session.step === 'WAITING_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.newMod = { id: 'VOLX-'+Math.random().toString(36).substr(2,4).toUpperCase(), content: fileId || ctx.message.text, type: fileId ? 'file' : 'link' };
        ctx.session.step = 'WAITING_DESC';
        return ctx.reply("📝 Digite a **DESCRIÇÃO**:");
    }
    if (ctx.session.step === 'WAITING_DESC') {
        ctx.session.newMod.description = ctx.message.text;
        mods.push(ctx.session.newMod);
        save(MODS_FILE, mods);
        ctx.reply(`✅ MOD CADASTRADO! ID: \`${ctx.session.newMod.id}\``, { parse_mode: 'Markdown' });
        ctx.session = null;
    }
});

bot.command('enviar', (ctx) => {
    if (ctx.from.id !== OWNER_ID && !admins.includes(ctx.from.id)) return;
    ctx.session = { step: 'WAITING_CONTENT' };
    ctx.reply("📤 Envie o **ARQUIVO** ou **LINK**:");
});

bot.launch().then(() => console.log("🚀 VOLX ONLINE!"));

