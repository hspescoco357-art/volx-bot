const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');
const cron = require('node-cron');

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

// Reset de créditos às 00:00
cron.schedule('0 0 * * *', () => {
    Object.keys(users).forEach(id => { users[id].credits = 500; });
    save();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- MOTOR IA VOLX (DIRETA E SEM REPETIÇÃO) ---
const iaVolxEngine = (text, userId) => {
    const isOwner = userId === OWNER_ID;
    const lowerText = text.toLowerCase();
    const assinatura = "\n\n━━━━━━━━━━━━━━━\n👑 *Dono:* br7 modz\n📢 *Grupo:* t.me/volxcheats";
    
    if (!isOwner && (users[userId]?.credits || 0) <= 0) return "Estimado, seus créditos acabaram. Reset às 00:00." + assinatura;
    if (!isOwner) { users[userId].credits -= 10; save(); }

    if (!isOwner && ["crie", "gerar", "codigo", "script", "fazer"].some(p => lowerText.includes(p))) {
        return "Prezado, a criação de scripts é restrita ao dono br7 modz. Posso tirar dúvidas teóricas." + assinatura;
    }

    if (isOwner && (lowerText.includes("crie") || lowerText.includes("codigo"))) {
        return "Com certeza, br7 modz. Aqui está a estrutura solicitada:\n\n```cpp\n// Código gerado\n```" + assinatura;
    }

    // Resposta direta ao que foi perguntado
    return `Prezado, informo que: ${text} [Resposta Direta da IA]` + (isOwner ? "" : `\n\n💰 *Créditos:* ${users[userId].credits}`) + assinatura;
};

// --- OUVINTE DE MENSAGENS (IDS DE MODS E REPLIES) ---
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.toUpperCase();
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) {
            if (mod.cont.includes('http')) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
            return ctx.replyWithDocument(mod.cont, { caption: `📦 *MOD:* ${mod.desc}` });
        }
    }
    if (ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id) {
        return ctx.reply(iaVolxEngine(ctx.message.text, ctx.from.id), { parse_mode: 'Markdown' });
    }
    return next();
});

// --- COMANDOS DE ADMIN ---
bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) {
        return ctx.reply("👑 *DONO BR7 MODZ*\n\n/admin /unadmin /aviso /users /groups /enviar /delmod /iavolx /hist /credits /ranking /games", { parse_mode: 'Markdown' });
    }
    if (admins[id]) return ctx.reply(`🛡️ *ADMIN:* ${admins[id].join(', ')}`);
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    ctx.reply(`👥 *TOTAL REGISTRADOS:* ${Object.keys(users).length}`);
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Texto vazio.");
    const targets = [...Object.keys(users), ...groups];
    for (const t of targets) {
        try { await bot.telegram.sendMessage(t, `📢 *AVISO*\n\n${msg}`); await new Promise(r => setTimeout(r, 100)); } catch (e) {}
    }
    ctx.reply("✅ Enviado!");
});

// --- COMANDOS DE MODS ---
bot.command('mods', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("Este comando só funciona no meu privado.");
    let m = "📦 *CATÁLOGO PRIVADO:* \n\n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: \`${mod.id}\`\n`);
    ctx.reply(m || "Vazio");
});

bot.command('modsgroup', (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Este comando só funciona em grupos.");
    ctx.reply("📂 *MODS DISPONÍVEIS:* Verifique o catálogo no privado do bot clicando no nome dele.");
});

// --- JOGOS (QUIZ E VELHA) ---
bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'menu_quiz')],
        [Markup.button.callback('❌ Jogo da Velha (PvP)', 'velha_init')]
    ]));
});

bot.action('menu_quiz', ctx => {
    ctx.editMessageText("🎯 *DIFICULDADE:*", Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Fácil', 'q_facil'), Markup.button.callback('🟡 Médio', 'q_medio')],
        [Markup.button.callback('🔴 Difícil', 'q_dificil')]
    ]));
});

bot.action(/q_(.+)/, ctx => {
    const nivel = ctx.match[1].toUpperCase();
    ctx.reply(`🎯 Iniciando Quiz [${nivel}]. Pergunta 1: Qual o nome do dono?`);
});

bot.action('velha_init', ctx => {
    const gId = ctx.from.id;
    games_state[gId] = { p1: gId, p1_n: ctx.from.first_name };
    ctx.editMessageText(`🕹 *JOGO DA VELHA*\n\nEsperando oponente...`, 
    Markup.inlineKeyboard([[Markup.button.callback(`🤝 Jogar contra ${ctx.from.first_name}`, `v_join_${gId}`)]]));
});

bot.action(/v_join_(.+)/, ctx => {
    const gId = ctx.match[1];
    if (ctx.from.id == gId) return ctx.answerCbQuery("Não pode contra si mesmo!");
    ctx.editMessageText(`❌ Jogo Iniciado entre ${games_state[gId].p1_n} e ${ctx.from.first_name}!`);
});

// --- OUTROS ---
bot.command('link', (ctx) => ctx.reply(`🔗 *LINK:* https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));
bot.command('iavolx', (ctx) => ctx.reply(iaVolxEngine(ctx.payload || "Olá", ctx.from.id), { parse_mode: 'Markdown' }));

bot.start((ctx) => {
    if (users[ctx.from.id]) return ctx.reply("⚠️ Já registrado.");
    users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0, credits: 500 };
    save();
    ctx.reply("🚀 Registrado com 500 créditos IA!");
});

bot.launch();

