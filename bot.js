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

// --- BANCO DE DADOS ---
const loadJSON = (file, def) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def;
let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, []);

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// --- MIDDLEWARE DE PROTEÇÃO ---
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

// --- FUNÇÕES DE VERIFICAÇÃO ---
const isOwner = (id) => id === OWNER_ID;
const isAdmin = (id) => admins.includes(id) || id === OWNER_ID;

// --- COMANDOS DE DONO (MODERAÇÃO & ADMINS) ---

bot.command('admin', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = parseInt(ctx.payload);
    if (!target) return ctx.reply("❌ Use: /admin [ID]");
    if (!admins.includes(target)) { admins.push(target); save(); ctx.reply(`✅ ${target} agora é ADMIN.`); }
});

bot.command('unadmin', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = parseInt(ctx.payload);
    admins = admins.filter(id => id !== target);
    save();
    ctx.reply(`❌ ${target} removido dos ADMINS.`);
});

bot.command('ban', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = parseInt(ctx.payload);
    if (!target || !users[target]) return ctx.reply("❌ Use: /ban [ID]");
    users[target].banido = true;
    save();
    ctx.reply(`🚫 Usuário ${target} banido.`);
});

bot.command('unban', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = parseInt(ctx.payload);
    if (users[target]) { users[target].banido = false; save(); ctx.reply(`✅ Desbanido.`); }
});

bot.command('castigo', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const [id, min] = ctx.payload.split(' ');
    if (!id || !min) return ctx.reply("❌ /castigo [ID] [MIN]");
    if (!users[id]) users[id] = { nome: "User", ind: 0 };
    users[id].castigo = Date.now() + (parseInt(min) * 60000);
    save();
    ctx.reply(`🔇 ${id} silenciado por ${min} min.`);
});

bot.command('uncastigo', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = parseInt(ctx.payload);
    if (users[target]) { users[target].castigo = 0; save(); ctx.reply(`🔊 Castigo removido.`); }
});

bot.command('aviso', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Use: /aviso [texto]");
    const allUsers = Object.keys(users);
    ctx.reply(`📢 Enviando para ${allUsers.length} usuários...`);
    for (const id of allUsers) {
        bot.telegram.sendMessage(id, `📢 *AVISO VOLX CHEATS*\n\n${msg}`, { parse_mode: 'Markdown' }).catch(() => {});
    }
});

// --- COMANDOS DE ADMIN (ENVIAR/DELMOD/USERS) ---

bot.command('enviar', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    ctx.session = { step: 'WAITING_CONTENT' };
    ctx.reply("📤 Envie o **ARQUIVO** ou **LINK**:");
});

bot.command('delmod', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const modId = ctx.payload.toUpperCase().trim();
    const index = mods.findIndex(m => m.id === modId);
    if (index > -1) { mods.splice(index, 1); save(); ctx.reply(`🗑️ Mod \`${modId}\` removido.`); }
    else { ctx.reply("❌ Não encontrado."); }
});

bot.command('users', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const lista = Object.entries(users);
    let msg = `👥 *USUÁRIOS:* ${lista.length}\n\n`;
    lista.slice(-20).forEach(([id, u]) => { msg += `👤 ${u.nome} | ID: \`${id}\` | Refs: ${u.ind}\n`; });
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (!isAdmin(id)) return;
    let menu = `👑 *PAINEL VOLX*\n\n/enviar - Add mod\n/users - Ver IDs\n/delmod [ID] - Apagar\n`;
    if (isOwner(id)) {
        menu += `\n🛡️ *MODERAÇÃO*\n/ban /unban\n/castigo /uncastigo\n/aviso [texto]\n/admin /unadmin`;
    }
    ctx.reply(menu, { parse_mode: 'Markdown' });
});

// --- COMANDOS PÚBLICOS E GRUPOS ---

bot.command('ranking', (ctx) => {
    const lista = Object.entries(users)
        .filter(([id, u]) => u.ind > 0)
        .sort((a, b) => b[1].ind - a[1].ind)
        .slice(0, 15);
    if (lista.length === 0) return ctx.reply("🏆 Ranking vazio.");
    let msg = "🏆 *TOP 15 INDICADORES*\n\n";
    lista.forEach(([id, u], i) => { msg += `${i + 1}º - ${u.nome} — *${u.ind}* refs\n`; });
    ctx.reply(msg, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.command('modsgroup', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Use /mods");
    if (mods.length === 0) return ctx.reply("📦 Catálogo vazio.");
    let msg = `📦 *CATÁLOGO DE MODS*\nPedido por: [${ctx.from.first_name}](tg://user?id=${ctx.from.id})\n\n`;
    mods.forEach(m => msg += `🔹 *${m.description}*\nID: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.start((ctx) => {
    if (ctx.chat.type !== 'private') return;
    const id = ctx.from.id;
    const ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        if (ref && users[ref] && ref != id) {
            users[ref].ind++;
            bot.telegram.sendMessage(ref, `🎉 Alguém entrou pelo seu link!`).catch(() => {});
        }
        save();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*`, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'att'], (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("Use /modsgroup");
    if (mods.length === 0) return ctx.reply("📦 Sem mods.");
    let msg = "📦 *CATÁLOGO*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nID: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 *Seu link:*\n\`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// --- LÓGICA DE EVENTOS ---
bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const mod = mods.find(m => m.id === ctx.message.text.toUpperCase());
    if (mod) {
        if (mod.type === 'file') ctx.replyWithDocument(mod.content, { caption: `✅ ${mod.description}` }).catch(() => {});
        else ctx.reply(`🔗 *Link:* ${mod.content}`).catch(() => {});
    }
});

bot.on(['document', 'video', 'audio', 'text'], async (ctx, next) => {
    if (!ctx.session || !isAdmin(ctx.from.id) || ctx.message.text?.startsWith('/')) return next();
    if (ctx.session.step === 'WAITING_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.newMod = { id: 'VOLX-'+Math.random().toString(36).substr(2,4).toUpperCase(), content: fileId || ctx.message.text, type: fileId ? 'file' : 'link' };
        ctx.session.step = 'WAITING_DESC';
        return ctx.reply("📝 Digite a **DESCRIÇÃO**:");
    }
    if (ctx.session.step === 'WAITING_DESC') {
        ctx.session.newMod.description = ctx.message.text;
        mods.push(ctx.session.newMod);
        save();
        ctx.reply(`✅ MOD CADASTRADO! ID: \`${ctx.session.newMod.id}\``);
        ctx.session = null;
    }
});

bot.launch().then(() => console.log("🚀 VOLX SUPREMO ONLINE!"));

