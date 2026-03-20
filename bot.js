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

// --- LÓGICA DE VITÓRIA VELHA ---
const checkWinner = (board) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let l of lines) {
        if (board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]) return board[l[0]];
    }
    return board.includes(null) ? null : 'Empate';
};

const renderBoard = (gId) => {
    const g = games_state[gId];
    const buttons = [];
    for (let i = 0; i < 9; i += 3) {
        buttons.push([
            Markup.button.callback(g.board[i] || '⬜', `vhit_${gId}_${i}`),
            Markup.button.callback(g.board[i+1] || '⬜', `vhit_${gId}_${i+1}`),
            Markup.button.callback(g.board[i+2] || '⬜', `vhit_${gId}_${i+2}`)
        ]);
    }
    return Markup.inlineKeyboard(buttons);
};

// --- OUVINTE DE MENSAGENS (AUTO-REGISTRO E MODS) ---
bot.on('message', async (ctx, next) => {
    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    if (ctx.from && !users[ctx.from.id]) { users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0 }; save(); }
    
    const text = ctx.message.text?.toUpperCase() || "";
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
    }
    return next();
});

// --- COMANDOS ADMINISTRATIVOS ---
bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 *MENU VOLX CHEATS*\n\n/admin /unadmin /aviso /avisogroups /users /enviar /delmod /ranking /games /link /id", { parse_mode: 'Markdown' });
});

bot.command('avisogroups', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite a mensagem.");
    for (const gId of groups) { try { await bot.telegram.sendMessage(gId, `📢 *AVISO:* ${msg}`); } catch(e){} }
    ctx.reply("✅ Enviado aos grupos.");
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    for (const uId of Object.keys(users)) { try { await bot.telegram.sendMessage(uId, `📩 *MENSAGEM:* ${ctx.payload}`); } catch(e){} }
    ctx.reply("✅ Enviado aos usuários.");
});

bot.command('admin', (ctx) => { 
    if (ctx.from.id === OWNER_ID) { admins[ctx.payload] = ['aviso','enviar']; save(); ctx.reply("🛡️ Admin Adicionado."); } 
});

bot.command('enviar', (ctx) => { 
    if (hasPerm(ctx.from.id, 'enviar')) ctx.reply("📤 Mande o link ou arquivo do MOD para registrar."); 
});

bot.command('id', (ctx) => ctx.reply(`Seu Chat ID: \`${ctx.chat.id}\``));

bot.command('users', (ctx) => {
    if (ctx.from.id === OWNER_ID) ctx.reply(`📊 Usuários: ${Object.keys(users).length}\n🏘 Grupos: ${groups.length}`);
});

// --- GAMES (QUIZ MAT/MOD + VELHA WIN FIX) ---
bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([[Markup.button.callback('❓ Quiz', 'menu_quiz')], [Markup.button.callback('❌ Jogo da Velha (PvP)', 'velha_init')]]));
});

bot.action('menu_quiz', ctx => {
    ctx.editMessageText("🎯 *ESCOLHA O NÍVEL:*", Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Fácil', 'qz_F'), Markup.button.callback('🟡 Médio', 'qz_M')],
        [Markup.button.callback('🔴 Difícil', 'qz_D')]
    ]));
});

bot.action(/qz_(.+)/, ctx => {
    const n = ctx.match[1];
    const data = { 
        'F': {q: "Quem é o dono da Volx?", a: "br7 modz"}, 
        'M': {q: "Resolva: 2x + 10 = 20. Qual o valor de X?", a: "5"}, 
        'D': {q: "O que é um 'Offset' no modding de Libs?", a: "Endereço na Lib"} 
    };
    ctx.editMessageText(`🎯 [NÍVEL ${n}]\n\n${data[n].q}`, Markup.inlineKeyboard([
        [Markup.button.callback(data[n].a, 'win')],
        [Markup.button.callback('Resposta Incorreta', 'loss')]
    ]));
});

bot.action('win', ctx => ctx.answerCbQuery("✅ ACERTOU!"));
bot.action('loss', ctx => ctx.answerCbQuery("❌ ERROU!"));

bot.action('velha_init', ctx => {
    const gId = ctx.from.id;
    games_state[gId] = { p1: gId, p1_n: ctx.from.first_name, board: Array(9).fill(null), turn: gId, active: true };
    ctx.editMessageText(`🕹 *JOGO DA VELHA*\n\nEsperando oponente aceitar...`, Markup.inlineKeyboard([[Markup.button.callback(`🤝 Aceitar Desafio`, `vjoin_${gId}`)]]));
});

bot.action(/vjoin_(.+)/, ctx => {
    const gId = ctx.match[1];
    if (ctx.from.id == gId) return ctx.answerCbQuery("Não pode jogar contra si mesmo!");
    games_state[gId].p2 = ctx.from.id;
    games_state[gId].p2_n = ctx.from.first_name;
    ctx.editMessageText(`⚔️ ${games_state[gId].p1_n} (❌) VS ${ctx.from.first_name} (⭕)`, renderBoard(gId));
});

bot.action(/vhit_(.+)_(.+)/, ctx => {
    const [gId, pos] = [ctx.match[1], parseInt(ctx.match[2])];
    const g = games_state[gId];
    if (!g || !g.active || ctx.from.id !== g.turn || g.board[pos]) return ctx.answerCbQuery("Aguarde sua vez!");

    g.board[pos] = ctx.from.id === g.p1 ? '❌' : '⭕';
    const win = checkWinner(g.board);
    
    if (win) {
        g.active = false;
        const result = win === 'Empate' ? "🤝 EMPATOU!" : `🏆 VENCEU: ${win === '❌' ? g.p1_n : g.p2_n}`;
        return ctx.editMessageText(result, renderBoard(gId));
    }
    
    g.turn = ctx.from.id === g.p1 ? g.p2 : g.p1;
    ctx.editMessageReplyMarkup(renderBoard(gId).reply_markup);
});

// --- RANKING E LINK ---
bot.command('ranking', (ctx) => {
    const s = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING DE INDICAÇÕES*\n\n";
    s.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind}\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => ctx.reply(`🔗 *SEU LINK DE CONVITE:*\nhttps://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));

bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        if (ref && users[ref] && ref != id) users[ref].ind++;
        save();
    }
    ctx.reply("🚀 *VOLX CHEATS ONLINE!* Use /comands para ver as funções.");
});

bot.launch();

