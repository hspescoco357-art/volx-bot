const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => { res.write('VOLX FINAL ONLINE'); res.end(); }).listen(process.env.PORT || 8080);

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

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- MIDDLEWARE DE VERIFICAÇÃO (APENAS COMANDOS) ---
bot.use(async (ctx, next) => {
    const id = ctx.from?.id;
    const text = ctx.message?.text || "";

    // Só bloqueia se for um COMANDO (começa com /) e não for o /start
    if (text.startsWith('/') && !text.startsWith('/start')) {
        if (!users[id]) {
            return ctx.reply("⚠️ *REGISTRO NECESSÁRIO!*\n\nVocê tentou usar um comando sem estar registrado.\n\n👉 Clique em /start para liberar o bot!", { parse_mode: 'Markdown' });
        }
    }
    return next();
});

// --- COMANDOS HIERÁRQUICOS ---

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    
    if (id === OWNER_ID) {
        return ctx.reply("👑 *MENU DONO SUPREMO*\n\n/admin [ID] [perms] - Dar poder\n/unadmin [ID] - Tirar poder\n/aviso [texto] - Global\n/ban [ID] - Banir\n/users - Lista completa\n/enviar - Add Mod\n/delmod [ID] - Apagar Mod", { parse_mode: 'Markdown' });
    } 
    
    if (admins[id]) {
        let m = "🛡️ *MENU ADMINISTRADOR*\nSeus poderes ativos:\n";
        admins[id].forEach(p => m += `🔹 /${p}\n`);
        return ctx.reply(m, { parse_mode: 'Markdown' });
    }

    ctx.reply("👤 *MENU MEMBRO*\n\n/mods - Ver catálogo\n/ranking - Top indicadores\n/link - Meu link ref\n/gaming - Central de Jogos", { parse_mode: 'Markdown' });
});

// --- CENTRAL GAMING (NÍVEIS E GRUPOS) ---

const quizData = {
    facil: [{ q: "Em C++, qual símbolo termina uma linha?", a: ";", o: [".", ":", ";"] }],
    medio: [{ q: "Java: O que significa 'new'?", a: "Objeto", o: ["Loop", "Objeto", "Erro"] }],
    dificil: [{ q: "C++: O que é um Pointer?", a: "Endereço", o: ["Variável", "Endereço", "Função"] }]
};

bot.command('gaming', (ctx) => {
    ctx.reply("🎮 *CENTRAL DE JOGOS VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Iniciar Quiz', 'set_quiz')],
        [Markup.button.callback('🧩 Iniciar Cruzadinha', 'set_cruz')]
    ]));
});

bot.action('set_quiz', ctx => ctx.editMessageText("🎯 *ESCOLHA O NÍVEL:*", Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Fácil', 'q_facil'), Markup.button.callback('🟡 Médio', 'q_medio')],
    [Markup.button.callback('🔴 Difícil', 'q_dificil')]
])));

bot.action(/^q_(.+)$/, (ctx) => {
    const nivel = ctx.match[1];
    if (nivel === 'win' || nivel === 'loss') return;
    const q = quizData[nivel][0];
    const b = q.o.map(opt => [Markup.button.callback(opt, opt === q.a ? 'ans_win' : 'ans_loss')]);
    ctx.editMessageText(`❓ [${nivel.toUpperCase()}]\n${q.q}`, Markup.inlineKeyboard(b));
});

bot.action('ans_win', ctx => ctx.editMessageText("🏆 *Acertou!*"));
bot.action('ans_loss', ctx => ctx.editMessageText("💀 *Errou!*"));

// --- COMANDOS PADRÃO ---

bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0 };
        if (ref && users[ref] && ref != id) {
            users[ref].ind++;
            bot.telegram.sendMessage(ref, `🎉 Novo indicado registrado!`).catch(() => {});
        }
        save();
    }
    ctx.reply(`👋 Olá ${ctx.from.first_name}! Registro concluído.\n\nUse /comands para ver o que você pode fazer!`);
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    if (!mods.length) return ctx.reply("📦 Catálogo vazio.");
    let m = "📦 *CATÁLOGO VOLX*\n\n";
    mods.forEach(mod => m += `🔹 *${mod.desc}* | ID: \`${mod.id}\`\n\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('link', (ctx) => {
    ctx.reply(`🔗 Link: \`https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

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

bot.catch((err) => console.log('Erro:', err));
bot.launch().then(() => console.log("🚀 VOLX 100% OPERACIONAL!"));

