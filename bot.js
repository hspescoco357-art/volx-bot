const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.writeHead(200); res.end('VOLX_SISTEMA_OK'); }).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091;
const DB_FILE = 'users_db.json';
const MODS_FILE = 'mods_db.json';
const GROUPS_FILE = 'groups_db.json';
const ADMINS_FILE = 'admins_db.json';

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const loadJSON = (file, def) => {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : def; }
    catch (e) { return def; }
};

let users = loadJSON(DB_FILE, {});
let mods = loadJSON(MODS_FILE, []);
let groups = loadJSON(GROUPS_FILE, []);
let admins = loadJSON(ADMINS_FILE, {});
let games_state = {};

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

const hasPerm = (id) => (id === OWNER_ID || admins[id]);

// --- TRAVA DE REGISTRO ---
bot.use((ctx, next) => {
    const id = ctx.from?.id;
    const isStart = ctx.message?.text?.startsWith('/start');
    if (id && !users[id] && !isStart) {
        return ctx.reply("⚠️ *ACESSO NEGADO!*\nVocê precisa se registrar primeiro usando /start no meu privado.", { parse_mode: 'Markdown' });
    }
    return next();
});

// --- LÓGICA DE VITÓRIA VELHA ---
const checkWinner = (b) => {
    const l = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let x of l) if (b[x[0]] && b[x[0]] === b[x[1]] && b[x[0]] === b[x[2]]) return b[x[0]];
    return b.includes(null) ? null : 'Empate';
};

const renderBoard = (gId) => {
    const g = games_state[gId];
    const bts = [];
    for (let i = 0; i < 9; i += 3) {
        bts.push([
            Markup.button.callback(g.board[i] || '⬜', `vhit_${gId}_${i}`),
            Markup.button.callback(g.board[i+1] || '⬜', `vhit_${gId}_${i+1}`),
            Markup.button.callback(g.board[i+2] || '⬜', `vhit_${gId}_${i+2}`)
        ]);
    }
    return Markup.inlineKeyboard(bts);
};

// --- COMANDOS USUÁRIO ---
bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        if (ref && users[ref] && ref != id) users[ref].ind++;
        save();
        return ctx.reply("🚀 *VOLX CHEATS:* Registro concluído!");
    }
    ctx.reply("✅ Você já está registrado.");
});

bot.command('mods', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("❌ Use no privado.");
    let m = "📂 *MODS:*\n\n";
    mods.forEach(mod => m += `🔹 ${mod.desc} [${mod.id}]\n`);
    ctx.reply(mods.length ? m : "Sem mods.", { parse_mode: 'Markdown' });
});

bot.command('ranking', (ctx) => {
    const s = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING DE INDICADORES*\n\n";
    s.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind}\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("❌ Peça no privado.");
    ctx.reply(`🔗 *LINK:* https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`);
});

bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA*", Markup.inlineKeyboard([[Markup.button.callback('❓ Quiz', 'menu_quiz')], [Markup.button.callback('❌ Velha', 'velha_init')]]));
});

// --- GAMES ACTIONS ---
bot.action('menu_quiz', ctx => ctx.editMessageText("🎯 *NÍVEL:*", Markup.inlineKeyboard([[Markup.button.callback('🟢 Fácil', 'qz_F'), Markup.button.callback('🟡 Médio', 'qz_M')], [Markup.button.callback('🔴 Difícil', 'qz_D')]])));

bot.action(/qz_(.+)/, ctx => {
    const n = ctx.match[1];
    const data = { 'F': ["Dono?", "br7 modz"], 'M': ["2x+10=20. X?", "5"], 'D': ["O que é Offset?", "Endereço Lib"] };
    ctx.editMessageText(`🎯 [${n}] ${data[n][0]}`, Markup.inlineKeyboard([[Markup.button.callback(data[n][1], 'win')], [Markup.button.callback('Errado', 'loss')]]));
});

bot.action('win', ctx => ctx.answerCbQuery("✅ ACERTOU!"));
bot.action('loss', ctx => ctx.answerCbQuery("❌ ERROU!"));

bot.action('velha_init', ctx => {
    const gId = ctx.from.id;
    games_state[gId] = { p1: gId, p1_n: ctx.from.first_name, board: Array(9).fill(null), turn: gId, active: true };
    ctx.editMessageText(`🕹 *VELHA*`, Markup.inlineKeyboard([[Markup.button.callback(`🤝 Aceitar`, `vjoin_${gId}`)]]));
});

bot.action(/vjoin_(.+)/, ctx => {
    const gId = ctx.match[1];
    if (ctx.from.id == gId) return;
    games_state[gId].p2 = ctx.from.id; games_state[gId].p2_n = ctx.from.first_name;
    ctx.editMessageText(`⚔️ ${games_state[gId].p1_n} VS ${ctx.from.first_name}`, renderBoard(gId));
});

bot.action(/vhit_(.+)_(.+)/, ctx => {
    const [gId, pos] = [ctx.match[1], parseInt(ctx.match[2])];
    const g = games_state[gId];
    if (!g || !g.active || ctx.from.id !== g.turn || g.board[pos]) return;
    g.board[pos] = ctx.from.id === g.p1 ? '❌' : '⭕';
    const win = checkWinner(g.board);
    if (win) { g.active = false; return ctx.editMessageText(win === 'Empate' ? "🤝 Empate!" : `🏆 Venceu: ${win === '❌' ? g.p1_n : g.p2_n}`, renderBoard(gId)); }
    g.turn = ctx.from.id === g.p1 ? g.p2 : g.p1;
    ctx.editMessageReplyMarkup(renderBoard(gId).reply_markup);
});

// --- COMANDOS DONO ---
bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 *MENU DONO br7 modz*\n/addgroup /avisogroups /users /enviar /id /admin /ranking");
});

bot.command('addgroup', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 Clique abaixo para me adicionar ao grupo:", Markup.inlineKeyboard([[Markup.button.url("➕ Adicionar", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]]));
});

bot.command('avisogroups', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if(!msg) return ctx.reply("Digite a msg.");
    for (const gId of groups) { try { await bot.telegram.sendMessage(gId, `📢 *AVISO:* ${msg}`); } catch(e){} }
    ctx.reply("✅ Enviado!");
});

bot.command('id', (ctx) => ctx.reply(`Chat ID: \`${ctx.chat.id}\``));

bot.on('message', (ctx, next) => {
    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    const text = ctx.message.text?.toUpperCase() || "";
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
    }
    return next();
});

bot.launch();

