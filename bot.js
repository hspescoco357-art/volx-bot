const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.write('VOLX SUPREMO ONLINE'); res.end(); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const ADMINS_FILE = 'admins_db.json';
const GROUPS_FILE = 'groups_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const loadJSON = (file, def) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def; }
    catch (e) { return def; }
};

let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let admins = loadJSON(ADMINS_FILE, {});
let groups = loadJSON(GROUPS_FILE, []);

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
};

// Captura de grupos e novos usuários
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    }
    const id = ctx.from?.id;
    if (id && !users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, banido: false };
        save();
    }
    return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS PÚBLICOS ---

bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (ref && users[ref] && ref != id) {
        users[ref].ind++;
        save();
        bot.telegram.sendMessage(ref, `🎉 Alguém entrou pelo seu link!`).catch(() => {});
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Bem-vindo ao *VOLX CHEATS*! 🚀\n\nUse /mods para ver os mods ou /gaming para jogar!`, { reply_to_message_id: ctx.message.message_id });
});

bot.command(['mods', 'att', 'modsgroup'], (ctx) => {
    if (!mods.length) return ctx.reply("📦 Catálogo vazio no momento.");
    let m = "📦 *CATÁLOGO DE MODS VOLX*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}*\nID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.reply(`🔗 *SEU LINK DE INDICAÇÃO:*\n\n\`${link}\`\n\nIndique amigos e suba no ranking!`, { parse_mode: 'Markdown' });
});

bot.command('ranking', (ctx) => {
    const r = Object.entries(users).filter(u => u[1].ind > 0).sort((a,b) => b[1].ind - a[1].ind).slice(0, 15);
    if (!r.length) return ctx.reply("🏆 Ranking vazio.");
    let m = "🏆 *TOP 15 INDICADORES*\n\n";
    r.forEach(([id, u], i) => m += `${i+1}º - ${u.nome} — *${u.ind}*\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('gaming', (ctx) => {
    ctx.reply("🎮 *CENTRAL DE JOGOS VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'menu_quiz')],
        [Markup.button.callback('🧩 Cruzadinha', 'menu_cruz')]
    ]));
});

// --- COMANDOS ADMIN/DONO ---

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    const lista = Object.entries(users);
    let m = `👥 *RELATÓRIO VOLX*\n\n`;
    lista.forEach(([id, u]) => {
        const cargo = id == OWNER_ID ? "👑 Dono" : (admins[id] ? "🛡️ Admin" : "👤 Membro");
        m += `👤 *${u.nome}* (\`${id}\`)\n📈 Refs: ${u.ind} | 🔰 ${cargo}\n\n`;
    });
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('aviso', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Use: /aviso [texto]");
    ctx.reply("📢 Enviando aviso...");
    Object.keys(users).forEach(id => bot.telegram.sendMessage(id, `📢 *AVISO*\n\n${msg}`).catch(() => {}));
    groups.forEach(gid => bot.telegram.sendMessage(gid, `📢 *AVISO GRUPO*\n\n${msg}`).catch(() => {}));
});

bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.session = { step: 'WAIT_C' };
    ctx.reply("📤 Envie o arquivo ou link:");
});

bot.command('delmod', (ctx) => {
    if (!hasPerm(ctx.from.id, 'delmod')) return;
    const modId = ctx.payload.toUpperCase().trim();
    mods = mods.filter(m => m.id !== modId);
    save(); ctx.reply(`🗑️ Mod ${modId} removido.`);
});

// --- ENTREGA E CRIAÇÃO ---

bot.hears(/^VOLX-[A-Z0-9]{4}$/i, (ctx) => {
    const m = mods.find(mod => mod.id === ctx.message.text.toUpperCase());
    if (m) {
        if (m.type === 'file') ctx.replyWithDocument(m.cont, { caption: m.desc }).catch(() => {});
        else ctx.reply(`🔗 Link: ${m.cont}`);
    }
});

bot.on(['document', 'video', 'audio', 'text'], (ctx, next) => {
    if (!ctx.session || !hasPerm(ctx.from.id, 'enviar') || ctx.message.text?.startsWith('/')) return next();
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

bot.catch((err) => console.log('Erro:', err));
bot.launch().then(() => console.log("🚀 VOLX COMPLETO ONLINE!"));

