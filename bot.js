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
    Object.keys(users).forEach(id => { if(users[id]) users[id].credits = 500; });
    save();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- MOTOR IA VOLX (HÍBRIDA & DIRETA) ---
const iaVolxEngine = (text, userId) => {
    const isOwner = userId === OWNER_ID;
    const lowerText = text.toLowerCase();
    const assinatura = "\n\n━━━━━━━━━━━━━━━\n👑 *Dono:* br7 modz\n📢 *Grupo:* t.me/volxcheats";
    
    if (!isOwner && (users[userId]?.credits || 0) <= 0) return "⚠️ Créditos insuficientes. Reset às 00:00." + assinatura;

    // Filtro de Modding
    const blockModding = ["hack", "mod", "script", "offset", "lib", "cheat", "free fire", "roblox", "aim", "silent"];
    if (!isOwner && blockModding.some(p => lowerText.includes(p))) {
        return "📚 *ASSISTENTE:* Assuntos de Modding são restritos ao **br7 modz**. Posso te ajudar com dever de casa ou perguntas gerais." + assinatura;
    }

    if (!isOwner) { users[userId].credits -= 10; save(); }

    if (isOwner && (lowerText.includes("crie") || lowerText.includes("codigo") || lowerText.includes("mod"))) {
        return `✅ **Com certeza, br7 modz.** Aqui está a lógica solicitada:\n\n\`\`\`cpp\n// Gerado para o Proprietário\nvoid main() { /* Seu código aqui */ }\n\`\`\`` + assinatura;
    }

    return `Prezado, sobre "${text}": Aqui está a resposta direta solicitada para seu auxílio.` + (isOwner ? "" : `\n\n💰 *Créditos:* ${users[userId].credits}`) + assinatura;
};

// --- OUVINTE DE MENSAGENS E GRUPOS ---
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;

    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) {
        groups.push(ctx.chat.id); save();
    }

    if (text.toUpperCase().startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text.toUpperCase());
        if (mod) return mod.cont.includes('http') ? ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`) : ctx.replyWithDocument(mod.cont, { caption: `📦 *MOD:* ${mod.desc}` });
    }

    if (ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id) {
        return ctx.reply(iaVolxEngine(text, userId), { parse_mode: 'Markdown' });
    }
    return next();
});

// --- COMANDOS DE ADMINISTRAÇÃO ---
bot.command('comands', (ctx) => {
    if (ctx.from.id === OWNER_ID) return ctx.reply("👑 *MENU DONO*\n\n/admin /unadmin /aviso /avisogroups /users /groups /enviar /delmod /ia /credits /ranking /games /link", { parse_mode: 'Markdown' });
});

bot.command('avisogroups', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite a mensagem.");
    for (const gId of groups) { try { await bot.telegram.sendMessage(gId, `📢 *AVISO:* ${msg}`); } catch (e) {} }
    ctx.reply("✅ Enviado aos grupos.");
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const userIds = Object.keys(users);
    for (const uId of userIds) { try { await bot.telegram.sendMessage(uId, `📢 *AVISO:* ${ctx.payload}`); } catch (e) {} }
    ctx.reply("✅ Enviado aos usuários.");
});

// --- SISTEMA DE JOGOS (FIX QUIZ) ---
bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'menu_quiz')],
        [Markup.button.callback('❌ Jogo da Velha (PvP)', 'velha_init')]
    ]));
});

bot.action('menu_quiz', ctx => {
    ctx.editMessageText("🎯 *DIFICULDADE:*", Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Fácil', 'qz_facil'), Markup.button.callback('🟡 Médio', 'qz_medio')],
        [Markup.button.callback('🔴 Difícil', 'qz_dificil')]
    ]));
});

bot.action(/qz_(.+)/, ctx => {
    const nivel = ctx.match[1].toUpperCase();
    ctx.answerCbQuery();
    ctx.reply(`🎯 Quiz [${nivel}] iniciado! Pergunta 1: ...`);
});

bot.action('velha_init', ctx => {
    const gId = ctx.from.id;
    games_state[gId] = { p1: gId, p1_n: ctx.from.first_name };
    ctx.editMessageText(`🕹 *JOGO DA VELHA*\nEsperando oponente...`, 
    Markup.inlineKeyboard([[Markup.button.callback(`🤝 Aceitar de ${ctx.from.first_name}`, `vj_${gId}`)]]));
});

bot.action(/vj_(.+)/, ctx => {
    const gId = ctx.match[1];
    if (ctx.from.id == gId) return ctx.answerCbQuery("Não pode contra si mesmo!");
    ctx.editMessageText(`⚔️ Jogo Iniciado: ${games_state[gId].p1_n} VS ${ctx.from.first_name}`);
});

// --- GERAL ---
bot.command('ia', (ctx) => ctx.reply(iaVolxEngine(ctx.payload || "Olá", ctx.from.id), { parse_mode: 'Markdown' }));

bot.command('link', (ctx) => ctx.reply(`🔗 *SEU LINK:* https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));

bot.command('mods', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("Apenas no PV!");
    let m = "📦 *CATÁLOGO:* \n\n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: \`${mod.id}\`\n`);
    ctx.reply(m || "Vazio");
});

bot.command('modsgroup', (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Comando para grupos.");
    ctx.reply("📂 Verifique o catálogo no meu privado!");
});

bot.command('ranking', (ctx) => {
    const sorted = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING INDICADORES*\n\n";
    sorted.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind} refs\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (!users[id]) {
        users[id] = { nome: ctx.from.first_name, ind: 0, credits: 500 };
        if (ref && users[ref] && ref != id) users[ref].ind++;
        save();
    }
    ctx.reply("🚀 *VOLX CHEATS ATIVO!*");
});

bot.launch();

