const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_OK'); }).listen(process.env.PORT || 8080);

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

// --- FILTRO DE SEGURANÇA ---
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    }
    const text = ctx.message?.text || "";
    const myCmds = ['/start', '/mods', '/ranking', '/link', '/games', '/modsgroup', '/comands', '/aviso', '/admin', '/unadmin', '/users', '/groups', '/enviar', '/delmod'];
    const isMyCmd = myCmds.some(c => text.startsWith(c));
    
    // Se estiver no meio de um envio, permite continuar
    if (!isMyCmd && !ctx.session?.step) return next();

    const id = ctx.from?.id;
    if (id && !users[id] && !text.startsWith('/start')) {
        return ctx.reply("⚠️ *REGISTRO NECESSÁRIO!*\nUse /start para liberar o bot.", { parse_mode: 'Markdown' });
    }
    return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS DONO / ADMIN ---

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) {
        return ctx.reply("👑 *BEM-VINDO DONO BR7 MODZ*\n\n/admin [ID] [perms]\n/unadmin [ID]\n/aviso [texto]\n/users\n/groups\n/enviar\n/delmod [ID]", { parse_mode: 'Markdown' });
    } 
    if (admins[id]) {
        return ctx.reply(`🛡️ *MENU ADMIN*\nPoderes: ${admins[id].join(', ')}`, { parse_mode: 'Markdown' });
    }
});

// --- SISTEMA DE ENVIAR (ARQUIVOS OU LINKS) ---

bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.session = { step: 'WAIT_MOD' };
    ctx.reply("📤 *MODO DE ENVIO ATIVO*\n\nVocê pode enviar:\n1. Um **Arquivo** (com descrição na legenda)\n2. Um **Link** (cole o link e a descrição junto)\n3. Apenas **Texto**.");
});

bot.on(['document', 'video', 'photo', 'text'], async (ctx, next) => {
    if (!ctx.session || ctx.session.step !== 'WAIT_MOD') return next();
    if (ctx.message.text?.startsWith('/')) { ctx.session = null; return next(); }

    const isFile = ctx.message.document || ctx.message.video || ctx.message.photo;
    const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.photo?.[0]?.file_id || null;
    const content = fileId || ctx.message.text; // Se não for arquivo, salva o texto/link
    const description = ctx.message.caption || (fileId ? "Arquivo sem descrição" : ctx.message.text);
    const modId = 'VOLX-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    mods.push({ 
        id: modId, 
        cont: content, 
        desc: description, 
        type: fileId ? 'file' : 'link' 
    });
    save();

    ctx.session = null;
    ctx.reply(`✅ *CONTEÚDO ADICIONADO!*\n\n📝 *Descrição:* ${description}\n🆔 *ID:* \`${modId}\`\n📂 *Tipo:* ${fileId ? 'Arquivo' : 'Link/Texto'}`, { parse_mode: 'Markdown' });
});

bot.command('delmod', (ctx) => {
    if (!hasPerm(ctx.from.id, 'delmod')) return;
    const idDel = ctx.payload.trim();
    if (!idDel) return ctx.reply("❌ Use: /delmod [ID]");
    const index = mods.findIndex(m => m.id === idDel);
    if (index === -1) return ctx.reply("❌ Não encontrado.");
    mods.splice(index, 1);
    save();
    ctx.reply(`🗑️ Item \`${idDel}\` removido.`);
});

// --- RANKING ---
bot.command('ranking', (ctx) => {
    const sorted = Object.entries(users).sort(([, a], [, b]) => b.ind - a.ind).slice(0, 10);
    if (!sorted.length) return ctx.reply("🏆 Ranking vazio.");
    let m = "🏆 *TOP 10 INDICADORES VOLX*\n\n";
    sorted.forEach(([id, u], i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔹";
        m += `${medal} *${u.nome}* — ${u.ind} refs\n`;
    });
    ctx.reply(m, { parse_mode: 'Markdown' });
});

// --- DEMAIS COMANDOS ---
bot.command('groups', (ctx) => {
    if (!hasPerm(ctx.from.id, 'groups')) return;
    ctx.reply(`📡 Grupos: ${groups.length}\nIDs:\n${groups.join('\n')}`);
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    let m = "📦 *CATÁLOGO VOLX:*\n\n";
    mods.forEach(mod => {
        m += `🔹 *${mod.desc}*\n🆔 ID: \`${mod.id}\`\n\n`;
    });
    ctx.reply(m || "Vazio", { parse_mode: 'Markdown' });
});

bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        if (ref && users[ref] && ref != id) { users[ref].ind++; save(); }
        save();
    }
    ctx.reply("🚀 *VOLX CHEATS REGISTRADO!*");
});

bot.command('link', (ctx) => ctx.reply(`🔗 Link: t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));

// --- JOGOS (QUIZ) ---
bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'set_quiz')]
    ]));
});

bot.action('set_quiz', ctx => ctx.editMessageText("🎯 *NÍVEL:*", Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Fácil', 'q_facil'), Markup.button.callback('🟡 Médio', 'q_medio')]
])));

bot.action(/^q_(.+)$/, (ctx) => {
    const nivel = ctx.match[1];
    const data = { facil: { q: "2+2?", a: "4", o: ["3","4"] }, medio: { q: "JS é?", a: "Lang", o: ["Lang","App"] } }[nivel];
    const btn = data.o.map(opt => [Markup.button.callback(opt, opt === data.a ? 'ans_win' : 'ans_loss')]);
    ctx.editMessageText(`❓ ${data.q}`, Markup.inlineKeyboard(btn));
});

bot.action('ans_win', ctx => ctx.editMessageText("🏆 *ACERTOU!*"));
bot.action('ans_loss', ctx => ctx.editMessageText("💀 *ERROU!*"));

bot.launch();

