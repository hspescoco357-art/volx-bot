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

// --- MIDDLEWARE: SÓ RESPONDE EM GRUPO SE FOR ADM ---
bot.use(async (ctx, next) => {
    if (ctx.chat.type !== 'private') {
        try {
            const botMember = await ctx.getChatMember(ctx.botInfo.id);
            if (botMember.status !== 'administrator') return; // Ignora se não for ADM
        } catch (e) { return; }
    }
    
    // Proteção de Ban e Castigo
    const id = ctx.from?.id;
    if (id && users[id]?.banido) return;
    if (id && users[id]?.castigo && users[id].castigo > Date.now()) return;
    
    return next();
});

const isAdmin = (id) => admins.includes(id) || id === OWNER_ID;

// --- COMANDOS DE DONO ---
bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (target && !admins.includes(target)) { admins.push(target); save(); ctx.reply(`✅ ${target} agora é ADMIN.`); }
});

bot.command('unadmin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    admins = admins.filter(id => id !== target);
    save();
    ctx.reply(`❌ ${target} removido.`);
});

bot.command('ban', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const target = parseInt(ctx.payload);
    if (users[target]) { users[target].banido = true; save(); ctx.reply(`🚫 Banido: ${target}`); }
});

bot.command('castigo', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const [id, min] = ctx.payload.split(' ');
    if (id && min) {
        if (!users[id]) users[id] = { nome: "User", ind: 0 };
        users[id].castigo = Date.now() + (parseInt(min) * 60000);
        save();
        ctx.reply(`🔇 ${id} em castigo por ${min}m.`);
    }
});

bot.command('aviso', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return;
    Object.keys(users).forEach(id => {
        bot.telegram.sendMessage(id, `📢 *AVISO VOLX*\n\n${msg}`, { parse_mode: 'Markdown' }).catch(() => {});
    });
});

// --- COMANDOS DE ADMIN ---
bot.command('enviar', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    ctx.session = { step: 'WAITING_CONTENT' };
    ctx.reply("📤 Envie o arquivo ou link:");
});

bot.command('delmod', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const modId = ctx.payload.toUpperCase().trim();
    const index = mods.findIndex(m => m.id === modId);
    if (index > -1) { mods.splice(index, 1); save(); ctx.reply("🗑️ Removido."); }
});

bot.command('users', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const lista = Object.entries(users);
    let msg = `👥 *TOTAL:* ${lista.length}\n\n`;
    lista.slice(-20).forEach(([id, u]) => msg += `👤 ${u.nome} | \`${id}\` | Refs: ${u.ind}\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('comands', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    let menu = `👑 *MENU ADMIN*\n/enviar\n/users\n/delmod [ID]`;
    if (ctx.from.id === OWNER_ID) menu += `\n\n🛡️ *DONO*\n/ban /admin /castigo /aviso`;
    ctx.reply(menu);
});

// --- COMANDOS GERAIS ---
bot.command('ranking', (ctx) => {
    const lista = Object.entries(users).filter(([id, u]) => u.ind > 0).sort((a,b) => b[1].ind - a[1].ind).slice(0, 15);
    if (lista.length === 0) return ctx.reply("🏆 Ranking vazio.");
    let msg = "🏆 *TOP 15 INDICADORES*\n\n";
    lista.forEach(([id, u], i) => msg += `${i+1}º - ${u.nome} — *${u.ind}*\n`);
    ctx.reply(msg, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.command('modsgroup', (ctx) => {
    if (ctx.chat.type === 'private') return;
    if (mods.length === 0) return ctx.reply("📦 Vazio.");
    let msg = `📦 *CATÁLOGO VOLX*\n\n`;
    mods.forEach(m => msg += `🔹 *${m.description}*\nID: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.start((ctx) => {
    if (ctx.chat.type !== 'private') return;
    const id = ctx.from.id;
    const ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        if (ref && users[ref] && ref != id) { users[ref].ind++; save(); }
        save();
    }
    ctx.reply(`👋 Bem-vindo ao *VOLX CHEATS*!`, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'att'], (ctx) => {
    if (ctx.chat.type !== 'private') return;
    let msg = "📦 *CATÁLOGO*\n\n";
    mods.forEach(m => msg += `🔹 *${m.description}*\nID: \`${m.id}\`\n\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 Seu link: \`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// --- ENTREGA E CRIAÇÃO ---
bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const mod = mods.find(m => m.id === ctx.message.text.toUpperCase());
    if (mod) {
        if (mod.type === 'file') ctx.replyWithDocument(mod.content, { caption: mod.description }).catch(() => {});
        else ctx.reply(`🔗 Link: ${mod.content}`).catch(() => {});
    }
});

bot.on(['document', 'video', 'audio', 'text'], async (ctx, next) => {
    if (!ctx.session || !isAdmin(ctx.from.id) || ctx.message.text?.startsWith('/')) return next();
    if (ctx.session.step === 'WAITING_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.newMod = { id: 'VOLX-'+Math.random().toString(36).substr(2,4).toUpperCase(), content: fileId || ctx.message.text, type: fileId ? 'file' : 'link' };
        ctx.session.step = 'WAITING_DESC';
        return ctx.reply("📝 Digite a descrição:");
    }
    if (ctx.session.step === 'WAITING_DESC') {
        ctx.session.newMod.description = ctx.message.text;
        mods.push(ctx.session.newMod);
        save();
        ctx.reply("✅ Criado!");
        ctx.session = null;
    }
});

bot.launch().then(() => console.log("🚀 VOLX SUPREMO ONLINE!"));

