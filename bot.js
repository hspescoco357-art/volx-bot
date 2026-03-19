const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');

// Servidor básico para o Render
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

// --- OUVINTE DE MENSAGENS (IDS DE MODS E REGISTRO DE GRUPOS) ---
bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.toUpperCase();
    
    // Registrar grupo automaticamente
    if (ctx.chat.type.includes('group')) {
        if (!groups.includes(ctx.chat.id)) {
            groups.push(ctx.chat.id);
            save();
        }
    }

    // Busca de Mod por ID
    if (text.startsWith('VOLX-')) {
        const mod = mods.find(m => m.id === text);
        if (mod) {
            if (mod.cont.includes('http')) return ctx.reply(`📦 *MOD:* ${mod.desc}\n🔗 ${mod.cont}`);
            return ctx.replyWithDocument(mod.cont, { caption: `📦 *MOD:* ${mod.desc}` });
        }
    }
    return next();
});

// --- COMANDOS DE ADMINISTRAÇÃO ---

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) {
        return ctx.reply("👑 *MENU DO DONO BR7 MODZ*\n\n/admin /unadmin /aviso /avisogroups /users /groups /enviar /delmod /hist /ranking /games", { parse_mode: 'Markdown' });
    }
    if (admins[id]) return ctx.reply(`🛡️ *COMANDOS ADMIN:* ${admins[id].join(', ')}`);
});

bot.command('avisogroups', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite a mensagem após o comando.");
    
    ctx.reply(`📢 Enviando aviso para ${groups.length} grupos...`);
    for (const gId of groups) {
        try { 
            await bot.telegram.sendMessage(gId, `📢 *AVISO PARA OS GRUPOS*\n\n${msg}`, { parse_mode: 'Markdown' }); 
            await new Promise(r => setTimeout(r, 200)); 
        } catch (e) { console.log(`Erro no grupo ${gId}`); }
    }
    ctx.reply("✅ Envio para grupos concluído.");
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Digite o aviso.");
    const userIds = Object.keys(users);
    ctx.reply(`📢 Enviando para ${userIds.length} usuários...`);
    for (const uId of userIds) {
        try { await bot.telegram.sendMessage(uId, `📢 *AVISO INDIVIDUAL*\n\n${msg}`); } catch (e) {}
    }
    ctx.reply("✅ Aviso individual enviado.");
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    ctx.reply(`👥 *USUÁRIOS:* ${Object.keys(users).length}\n🏘 *GRUPOS:* ${groups.length}`);
});

// --- COMANDOS DE MODS ---

bot.command('mods', (ctx) => {
    if (ctx.chat.type !== 'private') return ctx.reply("Acesse meu privado para ver o catálogo.");
    let m = "📦 *CATÁLOGO VOLX CHEATS*\n\n";
    mods.forEach(mod => m += `🔹 ${mod.desc}\n🆔 ID: \`${mod.id}\`\n\n`);
    ctx.reply(m || "Nenhum mod disponível.", { parse_mode: 'Markdown' });
});

bot.command('modsgroup', (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Comando para grupos.");
    ctx.reply("📂 *MODS:* Verifique o catálogo no meu privado clicando no meu perfil.");
});

// --- SISTEMA DE JOGOS ---

bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([
        [Markup.button.callback('❓ Quiz', 'menu_quiz')],
        [Markup.button.callback('❌ Jogo da Velha (PvP)', 'velha_init')]
    ]));
});

bot.action('menu_quiz', ctx => {
    ctx.editMessageText("🎯 *ESCOLHA A DIFICULDADE:*", Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Fácil', 'qz_facil'), Markup.button.callback('🟡 Médio', 'qz_medio')],
        [Markup.button.callback('🔴 Difícil', 'qz_dificil')]
    ]));
});

// Resposta das dificuldades do Quiz
bot.action(/qz_(.+)/, ctx => {
    const nivel = ctx.match[1].toUpperCase();
    ctx.answerCbQuery();
    ctx.reply(`🎯 Iniciando Quiz no nível ${nivel}! Pergunta 1: ...`);
});

bot.action('velha_init', ctx => {
    const gId = ctx.from.id;
    games_state[gId] = { p1: gId, p1_n: ctx.from.first_name };
    ctx.editMessageText(`🕹 *JOGO DA VELHA*\n\nDesafiante: ${ctx.from.first_name}\n\nEsperando alguém aceitar...`, 
    Markup.inlineKeyboard([[Markup.button.callback(`🤝 Aceitar Desafio de ${ctx.from.first_name}`, `vj_${gId}`)]]));
});

bot.action(/vj_(.+)/, ctx => {
    const gId = ctx.match[1];
    if (ctx.from.id == gId) return ctx.answerCbQuery("Você não pode jogar contra si mesmo!");
    ctx.editMessageText(`⚔️ *PARTIDA INICIADA!* ⚔️\n\n${games_state[gId].p1_n} VS ${ctx.from.first_name}`);
});

// --- GERAL ---

bot.command('link', (ctx) => {
    ctx.reply(`🔗 *SEU LINK:* https://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`);
});

bot.command('ranking', (ctx) => {
    const sorted = Object.entries(users).sort(([,a],[,b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING INDICADORES*\n\n";
    sorted.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind} refs\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.start((ctx) => {
    if (!users[ctx.from.id]) {
        users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0 };
        save();
    }
    ctx.reply("🚀 *VOLX CHEATS:* Bot liberado! Use /comands para ver o que posso fazer.");
});

bot.launch();

