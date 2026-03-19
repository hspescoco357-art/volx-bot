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

// Reset de créditos diário (00:00)
cron.schedule('0 0 * * *', () => {
    Object.keys(users).forEach(id => { if(users[id]) users[id].credits = 500; });
    save();
});

// --- MOTOR IA VOLX (HÍBRIDA) ---
const iaVolxEngine = (text, userId) => {
    const isOwner = userId === OWNER_ID;
    const lowerText = text.toLowerCase();
    const assinatura = "\n\n━━━━━━━━━━━━━━━\n👑 *Dono:* br7 modz\n📢 *Grupo:* t.me/volxcheats";
    
    if (!isOwner && (users[userId]?.credits || 0) <= 0) return "⚠️ Créditos insuficientes. Reset às 00:00." + assinatura;

    // Se NÃO for o dono, bloqueia modding
    const blockModding = ["hack", "mod", "script", "offset", "lib", "cheat", "free fire", "roblox"];
    if (!isOwner && blockModding.some(p => lowerText.includes(p))) {
        return "📚 *AVISO:* Sou uma IA de auxílio escolar e geral. Perguntas sobre Modding são restritas ao meu mestre **br7 modz**." + assinatura;
    }

    if (!isOwner) { users[userId].credits -= 10; save(); }

    // Resposta Direta
    let resposta = "";
    if (isOwner && (lowerText.includes("script") || lowerText.includes("codigo") || lowerText.includes("mod"))) {
        resposta = `Entendido, **br7 modz**. Aqui está a lógica de modding solicitada:\n\n\`// Gerando código de elite...\``;
    } else {
        resposta = `Análise concluída: Sobre sua pergunta "${text}", informo que os dados apontam para a seguinte solução acadêmica/geral... [Resposta Direta]`;
    }

    return resposta + (isOwner ? "" : `\n\n💰 *Créditos:* ${users[userId].credits}`) + assinatura;
};

// --- OUVINTES ---
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    const textUP = text.toUpperCase();
    
    if (ctx.chat.type.includes('group') && !groups.includes(ctx.chat.id)) {
        groups.push(ctx.chat.id); save();
    }

    if (textUP.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === textUP);
        if (mod) return mod.cont.includes('http') ? ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`) : ctx.replyWithDocument(mod.cont, { caption: `📦 *MOD:* ${mod.desc}` });
    }

    if (ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id) {
        return ctx.reply(iaVolxEngine(text, ctx.from.id), { parse_mode: 'Markdown' });
    }
    return next();
});

// --- COMANDOS ---
bot.command('ia', (ctx) => ctx.reply(iaVolxEngine(ctx.payload || "Olá", ctx.from.id), { parse_mode: 'Markdown' }));

bot.command('comands', (ctx) => {
    if (ctx.from.id === OWNER_ID) return ctx.reply("👑 *MENU DONO*\n\n/admin /unadmin /aviso /avisogroups /users /groups /enviar /delmod /ia /credits /ranking /games", { parse_mode: 'Markdown' });
});

bot.command('avisogroups', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite o aviso.");
    for (const gId of groups) {
        try { await bot.telegram.sendMessage(gId, `📢 *AVISO:* ${msg}`); } catch (e) {}
    }
    ctx.reply("✅ Enviado aos grupos.");
});

bot.command('credits', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const [tid, val] = ctx.payload.split(' ');
    if (users[tid]) { users[tid].credits = parseInt(val); save(); ctx.reply("💰 Créditos atualizados."); }
});

bot.command('link', (ctx) => ctx.reply(`🔗 *LINK:* https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));

bot.command('mods', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("No PV!");
    let m = "📦 *CATÁLOGO:* \n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: \`${mod.id}\`\n`);
    ctx.reply(m || "Vazio");
});

bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA*", Markup.inlineKeyboard([[Markup.button.callback('❓ Quiz', 'menu_quiz')], [Markup.button.callback('❌ Velha', 'velha_init')]]));
});

bot.start((ctx) => {
    if (!users[ctx.from.id]) { users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0, credits: 500 }; save(); }
    ctx.reply("🚀 Sistema VOLX Ativo! Use /ia para dúvidas.");
});

bot.launch();

