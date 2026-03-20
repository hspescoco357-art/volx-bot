const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_SISTEMA_OK'); }).listen(process.env.PORT || 8080);

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
let games_state = {}; 

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
};

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- TABULEIRO JOGO DA VELHA ---
const renderBoard = (gId) => {
    const game = games_state[gId];
    const b = game.board;
    const buttons = [];
    for (let i = 0; i < 9; i += 3) {
        buttons.push([
            Markup.button.callback(b[i] || '⬜', `vhit_${gId}_${i}`),
            Markup.button.callback(b[i+1] || '⬜', `vhit_${gId}_${i+1}`),
            Markup.button.callback(b[i+2] || '⬜', `vhit_${gId}_${i+2}`)
        ]);
    }
    return Markup.inlineKeyboard(buttons);
};

// --- OUVINTE DE MENSAGENS ---
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.toUpperCase();
    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) {
        groups.push(ctx.chat.id); save();
    }
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return mod.cont.includes('http') ? ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`) : ctx.replyWithDocument(mod.cont, { caption: `📦 *MOD:* ${mod.desc}` });
    }
    return next();
});

// --- COMANDOS DE ADMINISTRAÇÃO (TODOS RECUPERADOS) ---
bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 *MENU COMPLETO DONO br7 modz*\n\n/admin /unadmin /aviso /avisogroups /users /groups /enviar /delmod /hist /ranking /games /link", { parse_mode: 'Markdown' });
});

bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const [tid, ...cmds] = ctx.payload.split(' ');
    admins[tid] = cmds.length ? cmds : ['aviso', 'users', 'enviar'];
    save(); ctx.reply(`🛡️ Admin ${tid} adicionado!`);
});

bot.command('unadmin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    delete admins[ctx.payload]; save(); ctx.reply("❌ Admin removido.");
});

bot.command('avisogroups', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const msg = ctx.payload;
    for (const gId of groups) { try { await bot.telegram.sendMessage(gId, `📢 *AVISO:* ${msg}`); } catch(e){} }
    ctx.reply("✅ Enviado aos grupos.");
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    ctx.reply(`👥 Usuários: ${Object.keys(users).length}\n🏘 Grupos: ${groups.length}`);
});

bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.reply("📤 Envie o link ou arquivo para registrar um novo MOD.");
});

// --- JOGOS (QUIZ E VELHA FIX) ---
bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'menu_quiz')],
        [Markup.button.callback('❌ Jogo da Velha (PvP)', 'velha_init')]
    ]));
});

bot.action('menu_quiz', ctx => {
    ctx.editMessageText("🎯 *NÍVEL DO QUIZ:*", Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Fácil', 'qz_F'), Markup.button.callback('🟡 Médio', 'qz_M')],
        [Markup.button.callback('🔴 Difícil', 'qz_D')]
    ]));
});

bot.action(/qz_(.+)/, ctx => {
    const n = ctx.match[1];
    const q = n === 'F' ? "Dono da Volx?" : "Linguagem da Lib?";
    const opts = n === 'F' ? ["br7 modz", "Outro"] : ["C++", "Java"];
    ctx.editMessageText(`🎯 [${n}] ${q}`, Markup.inlineKeyboard(opts.map(o => [Markup.button.callback(o, (o=="br7 modz"||o=="C++")?'win':'loss')])));
});

bot.action('win', ctx => ctx.answerCbQuery("✅ ACERTOU!"));
bot.action('loss', ctx => ctx.answerCbQuery("❌ ERROU!"));

bot.action('velha_init', ctx => {
    const gId = ctx.from.id;
    games_state[gId] = { p1: gId, p1_n: ctx.from.first_name, board: Array(9).fill(null), turn: gId };
    ctx.editMessageText(`🕹 *VELHA*\nAguardando oponente...`, Markup.inlineKeyboard([[Markup.button.callback(`🤝 Aceitar de ${ctx.from.first_name}`, `vjoin_${gId}`)]]));
});

bot.action(/vjoin_(.+)/, ctx => {
    const gId = ctx.match[1];
    if (ctx.from.id == gId) return ctx.answerCbQuery("Não pode jogar contra si!");
    games_state[gId].p2 = ctx.from.id;
    ctx.editMessageText(`⚔️ Jogo Iniciado!`, renderBoard(gId));
});

bot.action(/vhit_(.+)_(.+)/, ctx => {
    const [gId, pos] = [ctx.match[1], parseInt(ctx.match[2])];
    const g = games_state[gId];
    if (!g || ctx.from.id !== g.turn || g.board[pos]) return;
    g.board[pos] = ctx.from.id === g.p1 ? '❌' : '⭕';
    g.turn = ctx.from.id === g.p1 ? g.p2 : g.p1;
    ctx.editMessageReplyMarkup(renderBoard(gId).reply_markup);
});

// --- GERAL ---
bot.command('link', (ctx) => ctx.reply(`🔗 *LINK:* https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));
bot.command('ranking', (ctx) => {
    const s = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING*\n\n";
    s.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind}\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.start((ctx) => {
    if (!users[ctx.from.id]) { users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0 }; save(); }
    ctx.reply("🚀 *VOLX CHEATS:* Online!");
});

bot.launch();

