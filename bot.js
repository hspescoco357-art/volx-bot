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

// --- FILTRO DE COMANDOS (SÓ RESPONDE SE FOR COMANDO DO VOLX) ---
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    }

    const text = ctx.message?.text || "";
    const myCmds = ['/start', '/mods', '/ranking', '/link', '/games', '/modsgroup', '/comands', '/aviso', '/admin', '/unadmin', '/users'];
    
    // Verifica se a mensagem começa com um dos SEUS comandos
    const isMyCmd = myCmds.some(c => text.startsWith(c));
    
    // Se não for comando seu, ignora completamente (não responde "Registro Necessário")
    if (!isMyCmd) return next();

    const id = ctx.from?.id;
    if (id && !users[id] && !text.startsWith('/start')) {
        return ctx.reply("⚠️ *REGISTRO NECESSÁRIO!*\nUse /start para liberar o bot.", { parse_mode: 'Markdown' });
    }
    return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS DE DONO/ADMIN ---
bot.command('admin', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const args = ctx.payload.split(' ');
    if (args.length < 2) return ctx.reply("❌ Use: /admin [ID] [permissões]");
    admins[args[0]] = args.slice(1);
    save(); ctx.reply("✅ Admin adicionado.");
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    ctx.reply(`👥 Total de usuários: ${Object.keys(users).length}`);
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite a mensagem.");
    const targets = [...Object.keys(users), ...groups];
    for (const t of targets) {
        try { await bot.telegram.sendMessage(t, `📢 *AVISO*\n\n${msg}`); await new Promise(r => setTimeout(r, 100)); } catch (e) {}
    }
    ctx.reply("✅ Enviado.");
});

// --- SISTEMA DE JOGOS (QUIZ) ---
const quizData = {
    facil: { q: "Quanto é 5 + 5?", a: "10", o: ["8", "10", "12"] },
    medio: { q: "Linguagem usada no Android?", a: "Java", o: ["Java", "Swift", "C++"] },
    dificil: { q: "O que é um Pointer em C++?", a: "Endereço", o: ["Valor", "Endereço", "Função"] }
};

bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'set_quiz')],
        [Markup.button.callback('❌ Jogo da Velha', 'menu_velha')]
    ]));
});

bot.action('set_quiz', ctx => ctx.editMessageText("🎯 *NÍVEL:*", Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Fácil', 'q_facil'), Markup.button.callback('🟡 Médio', 'q_medio')],
    [Markup.button.callback('🔴 Difícil', 'q_dificil')]
])));

bot.action(/^q_(.+)$/, (ctx) => {
    const nivel = ctx.match[1];
    const data = quizData[nivel];
    const btn = data.o.map(opt => [Markup.button.callback(opt, opt === data.a ? 'ans_win' : 'ans_loss')]);
    ctx.editMessageText(`❓ *QUIZ [${nivel.toUpperCase()}]*\n\n${data.q}`, Markup.inlineKeyboard(btn));
});

bot.action('ans_win', ctx => ctx.editMessageText("🏆 *ACERTOU!*"));
bot.action('ans_loss', ctx => ctx.editMessageText("💀 *ERROU!*"));

// --- COMANDOS PÚBLICOS ---
bot.start((ctx) => {
    if (!users[ctx.from.id]) { users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0 }; save(); }
    ctx.reply("🚀 *VOLX CHEATS REGISTRADO!*");
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    let m = "📦 *CATÁLOGO:*\n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: ${mod.id}\n`);
    ctx.reply(m || "Vazio");
});

bot.command('link', (ctx) => ctx.reply(`🔗 Link: t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));

bot.launch();

