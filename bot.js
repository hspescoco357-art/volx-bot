const { Telegraf, session } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor básico para a Render não derrubar o bot
http.createServer((req, res) => { res.write('VOLX ONLINE'); res.end(); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Banco de dados simples
const load = (f, d) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : d;
let users = load(DB_FILE, {}), mods = load(MODS_FILE, []), admins = load(ADMINS_FILE, []);
const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// Middleware: Só responde em grupo se for ADM e ignora banidos
bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== 'private') {
        try {
            const me = await ctx.getChatMember(ctx.botInfo.id);
            if (me.status !== 'administrator') return;
        } catch (e) { return; }
    }
    const id = ctx.from?.id;
    if (id && (users[id]?.banido || (users[id]?.castigo > Date.now()))) return;
    return next();
});

const isAdmin = (id) => admins.includes(id) || id === OWNER_ID;

// --- COMANDOS DONO/ADMIN ---
bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const t = parseInt(ctx.payload);
    if (t && !admins.includes(t)) { admins.push(t); save(); ctx.reply(`✅ ${t} agora é ADMIN.`); }
});

bot.command('aviso', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite o texto.");
    Object.keys(users).forEach(id => bot.telegram.sendMessage(id, `📢 *AVISO*\n\n${msg}`, { parse_mode: 'Markdown' }).catch(() => {}));
    ctx.reply("✅ Enviado!");
});

bot.command('users', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    let msg = `👥 Usuários: ${Object.keys(users).length}\n\n`;
    Object.entries(users).slice(-15).forEach(([id, u]) => msg += `👤 ${u.nome} | \`${id}\`\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('enviar', (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    ctx.session = { step: 'WAIT_C' };
    ctx.reply("📤 Envie o arquivo ou link:");
});

// --- COMANDOS PÚBLICOS ---
bot.command('ranking', (ctx) => {
    const r = Object.entries(users).filter(u => u[1].ind > 0).sort((a,b) => b[1].ind - a[1].ind).slice(0, 10);
    if (!r.length) return ctx.reply("🏆 Ranking vazio.");
    let m = "🏆 *TOP INDICADORES*\n\n";
    r.forEach(([id, u], i) => m += `${i+1}º - ${u.nome} — *${u.ind}*\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('modsgroup', (ctx) => {
    if (ctx.chat.type === 'private') return;
    let m = "📦 *CATÁLOGO*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}*\nID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.start((ctx) => {
    if (ctx.chat.type !== 'private') return;
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false, castigo: 0 };
        if (ref && users[ref] && ref != id) { users[ref].ind++; save(); }
        save();
    }
    ctx.reply("👋 Bem-vindo ao *VOLX CHEATS*!");
});

// Entrega automática
bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const m = mods.find(mod => mod.id === ctx.message.text.toUpperCase());
    if (m) m.type === 'file' ? ctx.replyWithDocument(m.cont, { caption: m.desc }) : ctx.reply(`🔗 Link: ${m.cont}`);
});

// Lógica de criação
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
        ctx.reply("✅ Criado!"); ctx.session = null;
    }
});

bot.launch();

