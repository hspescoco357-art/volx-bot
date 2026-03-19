const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');
const cron = require('node-cron');

// Servidor para manter o bot ativo
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
let games_state = {}; // Controle do Jogo da Velha

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
};

// --- RESET DE CRÉDITOS ÀS 00:00 ---
cron.schedule('0 0 * * *', () => {
    Object.keys(users).forEach(id => { users[id].credits = 500; });
    save();
});

// --- MOTOR IA VOLX TOTAL ---
const iaVolxEngine = (text, userId) => {
    const isOwner = userId === OWNER_ID;
    const lowerText = text.toLowerCase();
    const assinatura = "\n\n━━━━━━━━━━━━━━━\n👑 *Dono:* br7 modz\n📢 *Grupo:* t.me/volxcheats";
    
    if (!isOwner && (users[userId]?.credits || 0) <= 0) {
        return "Prezado, seus créditos diários acabaram. Reset automático às 00:00." + assinatura;
    }

    if (!isOwner) {
        users[userId].credits -= 10;
        save();
        const proibido = ["crie", "gerar", "codigo", "script", "fazer"];
        if (proibido.some(p => lowerText.includes(p))) {
            return "Estimado usuário, por ordens de **br7 modz**, a geração de scripts é exclusiva para o proprietário." + assinatura;
        }
    }

    if (isOwner && (lowerText.includes("crie") || lowerText.includes("codigo"))) {
        return `Com certeza, **br7 modz**. Aqui está o código solicitado:\n\n\`\`\`cpp\n// Código Liberado para o Dono\nvoid main() { /* Lógica Volx */ }\n\`\`\`` + assinatura;
    }

    return `Prezado, processei sua mensagem: "${text}". Sou sua assistente formal VOLX. Como posso ajudar com C++, Java ou suporte geral?` + (isOwner ? "" : `\n\n💰 *Créditos:* ${users[userId].credits}`) + assinatura;
};

// --- MIDDLEWARE E OUVINTE DE IDS/REPLY ---
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;

    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text.toUpperCase());
        if (mod) {
            if (mod.cont.includes('http')) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
            return ctx.replyWithDocument(mod.cont, { caption: `📦 *MOD:* ${mod.desc}` });
        }
    }

    if (ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id) {
        return ctx.reply(iaVolxEngine(text, userId), { parse_mode: 'Markdown' });
    }
    return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS PRINCIPAIS ---

bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (users[id]) return ctx.reply("⚠️ Registro já existente.");
    users[id] = { nome: ctx.from.first_name, ind: 0, credits: 500 };
    if (ref && users[ref] && ref != id) { users[ref].ind++; }
    save();
    ctx.reply("🚀 *VOLX CHEATS REGISTRADO!* 500 créditos adicionados.");
});

bot.command('link', (ctx) => {
    const link = `https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`;
    ctx.reply(`🔗 *SEU LINK DE INDICAÇÃO:*\n\n\`${link}\`\n\nEnvie para amigos e suba no /ranking!`, { parse_mode: 'Markdown' });
});

bot.command('iavolx', (ctx) => {
    ctx.reply(iaVolxEngine(ctx.payload || "Olá", ctx.from.id), { parse_mode: 'Markdown' });
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    ctx.reply(`👥 *USUÁRIOS NO BANCO:* ${Object.keys(users).length}`);
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const targets = [...Object.keys(users), ...groups];
    for (const t of targets) {
        try { await bot.telegram.sendMessage(t, `📢 *AVISO:* ${ctx.payload}`); } catch(e){}
    }
    ctx.reply("✅ Enviado!");
});

// --- SISTEMA DE JOGOS ---
bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz (F/M/D)', 'menu_quiz')],
        [Markup.button.callback('❌ Jogo da Velha (PvP)', 'velha_init')]
    ]));
});

bot.action('menu_quiz', ctx => {
    ctx.editMessageText("🎯 Escolha o nível:", Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Fácil', 'q_facil'), Markup.button.callback('🟡 Médio', 'q_medio')],
        [Markup.button.callback('🔴 Difícil', 'q_dificil')]
    ]));
});

// Jogo da Velha (PvP)
bot.action('velha_init', ctx => {
    const gId = ctx.from.id;
    games_state[gId] = { p1: gId, p1_n: ctx.from.first_name, p2: null, board: Array(9).fill(null), turn: gId };
    ctx.editMessageText(`🕹 *JOGO DA VELHA*\n\nAguardando oponente...`, 
    Markup.inlineKeyboard([[Markup.button.callback(`🤝 Jogar contra ${ctx.from.first_name}`, `v_join_${gId}`)]]));
});

bot.action(/v_join_(.+)/, ctx => {
    const gId = ctx.match[1];
    if (ctx.from.id == gId) return ctx.answerCbQuery("Não pode jogar contra si mesmo!");
    games_state[gId].p2 = ctx.from.id;
    ctx.editMessageText(`❌ Jogo iniciado: ${games_state[gId].p1_n} vs ${ctx.from.first_name}\n\nVez de ${games_state[gId].p1_n}`, 
    Markup.inlineKeyboard([[Markup.button.callback('Começar', 'refresh')]])); // Renderizar tabuleiro real aqui
});

bot.command('ranking', (ctx) => {
    const sorted = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING INDICADORES*\n\n";
    sorted.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind} refs\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('mods', (ctx) => {
    let m = "📦 *MODS:* \n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: \`${mod.id}\`\n`);
    ctx.reply(m || "Vazio");
});

bot.launch();

