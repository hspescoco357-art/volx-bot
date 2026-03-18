const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.write('VOLX BOT ONLINE'); res.end(); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const loadJSON = (file, def) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def; }
    catch (e) { return def; }
};

let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, []);

const save = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
        fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    } catch (e) { console.log("Erro ao salvar."); }
};

bot.use(async (ctx, next) => {
    try {
        if (ctx.chat?.type !== 'private') {
            const me = await ctx.getChatMember(ctx.botInfo.id).catch(() => null);
            if (!me || me.status !== 'administrator') return; 
        }
        const id = ctx.from?.id;
        if (id && users[id]) {
            if (users[id].banido) return;
            if (users[id].castigo && users[id].castigo > Date.now()) return;
        }
        return next();
    } catch (e) { console.log("Erro no Middleware."); }
});

const isOwner = (id) => id === OWNER_ID;
const isAdmin = (id) => admins.includes(id) || id === OWNER_ID;

bot.command('admin', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const t = parseInt(ctx.payload);
    if (t && !admins.includes(t)) { admins.push(t); save(); ctx.reply(`✅ ${t} agora é ADMIN.`); }
});

bot.command('ban', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const t = parseInt(ctx.payload);
    if (users[t]) { users[t].banido = true; save(); ctx.reply(`🚫 Banido: ${t}`); }
});

bot.command('castigo', (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const [id, min] = ctx.payload.split(' ');
    if (id && min) {
        if (!users[id]) users[id] = { nome: "User", ind: 0 };
        users[id].castigo = Date.now() + (parseInt(min) * 60000);
        save(); ctx.reply(`🔇 ${id} castigado.`);
    }
});

bot.command('aviso', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const msg = ctx.payload;
    if (!msg) return;
    Object.keys(users).forEach(id => bot.telegram.sendMessage(id, `📢 *AVISO*\n\n${msg}`, { parse_mode: 'Markdown' }).catch(() => {}));
});

bot.command('enviar', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    ctx.session = { step: 'WAIT_C' };
    ctx.reply("📤 Envie o arquivo ou link:");
});

bot.command('users', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const lista = Object.entries(users);
    let msg = `👥 *USUÁRIOS:* ${lista.length}\n\n`;
    lista.slice(-15).forEach(([id, u]) => msg += `👤 ${u.nome || 'User'} | \`${id}\` | Refs: ${u.ind}\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('comands', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    let menu = `👑 *PAINEL*\n/enviar\n/users\n/delmod ID`;
    if (isOwner(ctx.from.id)) menu += `\n\n🛡️ /ban /castigo /aviso /admin`;
    ctx.reply(menu, { parse_mode: 'Markdown' });
});

bot.start((ctx) => {
    const id = ctx.from.id;
    const ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        if (ref && users[ref] && ref != id) { users[ref].ind++; save(); }
        save();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*!`, { reply_to_message_id: ctx.message.message_id });
});

bot.command('ranking', (ctx) => {
    const r = Object.entries(users).filter(u => u[1].ind > 0).sort((a,b) => b[1].ind - a[1].ind).slice(0, 15);
    if (!r.length) return ctx.reply("🏆 Ranking vazio.");
    let m = "🏆 *TOP 15 INDICADORES*\n\n";
    r.forEach(([id, u], i) => m += `${i+1}º - ${u.nome} — *${u.ind}*\n`);
    ctx.reply(m, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    if (!mods.length) return ctx.reply("📦 Vazio.");
    let m = `📦 *CATÁLOGO*\n\n`;
    mods.forEach(mod => m += `🔹 *${mod.desc}*\nID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 *Seu link:* \`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const m = mods.find(mod => mod.id === ctx.message.text.toUpperCase());
    if (m) {
        if (m.type === 'file') ctx.replyWithDocument(m.cont, { caption: m.desc }).catch(() => {});
        else ctx.reply(`🔗 Link: ${m.cont}`);
    }
});

bot.on(['document', 'video', 'audio', 'text'], (ctx, next) => {
    if (!ctx.session || !isAdmin(ctx.from.id) || ctx.message.text?.startsWith('/')) return next();
    if (ctx.session.step === 'WAIT_C') {
        const fid = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.audio?.file_id;
        ctx.session.new = { id: 'VOLX-'+Math.random().toString(36).substr(2,4).toUpperCase(), cont: fid || ctx.message.text, type: fid ? 'file' : 'link' };
        ctx.session.step = 'WAIT_D';
        return ctx.reply("📝 Digite a descrição:");
    }
    if (ctx.session.step === 'WAIT_D') {
        ctx.session.new.desc = ctx.message.text;
        mods.push(ctx.session.new); save();
        ctx.reply("✅ CRIADO!"); ctx.session = null;
    }
});

bot.catch((err) => { console.log('Erro:', err); });
bot.launch().then(() => console.log("🚀 VOLX ONLINE!"));

