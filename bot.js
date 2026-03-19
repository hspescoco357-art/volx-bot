const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.write('VOLX SECURE ONLINE'); res.end(); }).listen(process.env.PORT || 8080);

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
let admins = loadJSON(ADMINS_FILE, {});

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
};

// --- MIDDLEWARE DE VERIFICAÇÃO DE REGISTRO ---
bot.use(async (ctx, next) => {
    const id = ctx.from?.id;
    const text = ctx.message?.text || "";

    // Se não tem ID (canal/bot) ou se for o comando /start, permite passar
    if (!id || text.startsWith('/start')) return next();

    // Se o usuário NÃO está no banco de dados, bloqueia e avisa
    if (!users[id]) {
        return ctx.reply("⚠️ *ACESSO NEGADO!*\n\nVocê precisa iniciar o bot primeiro para usar as funções.\n\n👉 Clique em /start agora!", { parse_mode: 'Markdown' });
    }

    return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS PÚBLICOS ---

bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        if (ref && users[ref] && ref != id) {
            users[ref].ind++;
            bot.telegram.sendMessage(ref, `🎉 Novo indicado!`).catch(() => {});
        }
        save();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Registro concluído.\n\nAgora você pode usar /mods, /gaming ou /link!`);
});

bot.command('gaming', (ctx) => {
    ctx.reply("🎮 *CENTRAL DE JOGOS VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'set_quiz')],
        [Markup.button.callback('🧩 Cruzadinha', 'set_cruz')]
    ]));
});

// [Lógica de Quiz e Cruzadinha com níveis permanece aqui]
const quizData = {
    facil: [{ q: "10 + 5?", a: "15", o: ["12", "15", "20"] }],
    medio: [{ q: "Java: 'new' serve para?", a: "Objeto", o: ["Loop", "Objeto", "Erro"] }],
    dificil: [{ q: "C++: O que é um Pointer?", a: "Memória", o: ["Variável", "Memória", "Função"] }]
};

bot.action('set_quiz', ctx => ctx.editMessageText("🎯 *NÍVEL DO QUIZ:*", Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Fácil', 'q_facil'), Markup.button.callback('🟡 Médio', 'q_medio')],
    [Markup.button.callback('🔴 Difícil', 'q_dificil')]
])));

bot.action(/^q_(.+)$/, (ctx) => {
    const nivel = ctx.match[1];
    const quest = quizData[nivel][0]; // Exemplo simples
    const buttons = quest.o.map(opt => [Markup.button.callback(opt, opt === quest.a ? 'ans_win' : 'ans_loss')]);
    ctx.editMessageText(`❓ [${nivel.toUpperCase()}]\n${quest.q}`, Markup.inlineKeyboard(buttons));
});

bot.action('ans_win', ctx => ctx.editMessageText("🏆 *Acertou!*"));
bot.action('ans_loss', ctx => ctx.editMessageText("💀 *Errou!*"));

// --- COMANDOS ADMINISTRATIVOS ---

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

bot.command(['mods', 'att', 'modsgroup'], (ctx) => {
    if (!mods.length) return ctx.reply("📦 Vazio.");
    let m = "📦 *CATÁLOGO VOLX*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}* | ID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 Link: \`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.catch((err) => console.log('Erro:', err));
bot.launch().then(() => console.log("🚀 VOLX PROTEGIDO ONLINE!"));

