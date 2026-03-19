const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const http = require('http');
const cron = require('node-cron');

// Servidor básico
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

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
};

// --- RESET DE CRÉDITOS (MEIA-NOITE) ---
cron.schedule('0 0 * * *', () => {
    Object.keys(users).forEach(id => { users[id].credits = 500; });
    save();
    console.log("Créditos resetados para 500.");
});

// --- MOTOR IA VOLX (GERAL E FORMAL) ---
const iaVolxEngine = (text, userId) => {
    const isOwner = userId === OWNER_ID;
    const lowerText = text.toLowerCase();
    const assinatura = "\n\n━━━━━━━━━━━━━━━\n👑 *Dono:* br7 modz\n📢 *Grupo:* t.me/volxcheats";
    
    if (!isOwner && (users[userId]?.credits || 0) <= 0) {
        return "Prezado, seus créditos diários foram exauridos. Aguarde o reset às 00:00." + assinatura;
    }

    if (!isOwner) users[userId].credits -= 10;
    save();

    // Bloqueio de código para usuários
    const toraCodigo = ["crie", "gerar", "script", "hack", "codigo", "code"];
    if (toraCodigo.some(p => lowerText.includes(p)) && !isOwner) {
        return "Estimado, por ordens de **br7 modz**, não gero códigos prontos. Posso apenas ensinar a lógica e tirar dúvidas." + assinatura;
    }

    return `Prezado entusiasta, sobre sua dúvida ("${text}"), informo que minha base de dados está processando os melhores métodos para auxiliá-lo em C++, Java, Projetos ou qualquer outro tema solicitado. Como posso ser útil?` + (isOwner ? "" : `\n\n💰 *Créditos:* ${users[userId].credits}`) + assinatura;
};

// --- MIDDLEWARES ---
bot.use(async (ctx, next) => {
    if (ctx.chat?.type?.includes('group')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    }
    // Resposta imediata em Reply
    if (ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id) {
        return ctx.reply(iaVolxEngine(ctx.message.text, ctx.from.id), { parse_mode: 'Markdown' });
    }
    return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS DONO / ADMIN ---

bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) return ctx.reply("👑 *DONO BR7 MODZ*\n\n/admin /unadmin /aviso /users /groups /enviar /delmod /iavolx /hist /credits /ranking /games", { parse_mode: 'Markdown' });
    if (admins[id]) return ctx.reply(`🛡️ *ADMIN:* ${admins[id].join(', ')}`);
});

bot.command('users', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    ctx.reply(`👥 *REGISTRADOS:* ${Object.keys(users).length}`);
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const msg = ctx.payload;
    if (!msg) return ctx.reply("❌ Texto vazio.");
    const targets = [...Object.keys(users), ...groups];
    ctx.reply(`📢 Enviando para ${targets.length} destinos...`);
    for (const t of targets) {
        try { await bot.telegram.sendMessage(t, `📢 *AVISO*\n\n${msg}`); await new Promise(r => setTimeout(r, 100)); } catch (e) {}
    }
    ctx.reply("✅ Enviado.");
});

bot.command('credits', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const [tid, val] = ctx.payload.split(' ');
    if (users[tid]) { users[tid].credits = parseInt(val); save(); ctx.reply("✅ Créditos atualizados."); }
});

bot.command('hist', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    const u = users[ctx.payload.trim()];
    if (u) ctx.reply(`👤 *NOME:* ${u.nome}\n📈 *REFS:* ${u.ind}\n💰 *CRÉDITOS:* ${u.credits}`);
});

// --- SISTEMA ENVIAR (2 ETAPAS) ---
bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.session = { step: 'WAIT_CONTENT' };
    ctx.reply("📤 *PASSO 1:* Envie o arquivo ou link.");
});

bot.on(['document', 'video', 'photo', 'text'], async (ctx, next) => {
    if (!ctx.session?.step) return next();
    if (ctx.session.step === 'WAIT_CONTENT') {
        ctx.session.content = ctx.message.document?.file_id || ctx.message.text;
        ctx.session.step = 'WAIT_DESC';
        return ctx.reply("📝 *PASSO 2:* Envie a descrição.");
    }
    if (ctx.session.step === 'WAIT_DESC') {
        const modId = 'VOLX-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        mods.push({ id: modId, cont: ctx.session.content, desc: ctx.message.text });
        save(); ctx.session = null;
        ctx.reply(`✅ Salvo! ID: \`${modId}\``);
    }
});

// --- PÚBLICO E JOGOS ---
bot.start((ctx) => {
    if (users[ctx.from.id]) return ctx.reply("⚠️ Registro único! Você já está no sistema.");
    users[ctx.from.id] = { nome: ctx.from.first_name, ind: 0, credits: 500 };
    if (ctx.payload && users[ctx.payload] && ctx.payload != ctx.from.id) users[ctx.payload].ind++;
    save();
    ctx.reply("🚀 *VOLX CHEATS REGISTRADO!* +500 Créditos IA.");
});

bot.command('iavolx', (ctx) => ctx.reply(iaVolxEngine(ctx.payload, ctx.from.id), { parse_mode: 'Markdown' }));

bot.command('ranking', (ctx) => {
    const sorted = Object.entries(users).sort(([, a], [, b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING INDICADORES*\n\n";
    sorted.forEach(([id, u], i) => m += `${i==0?"🥇":"🔹"} *${u.nome}* — ${u.ind} refs\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command('games', (ctx) => {
    ctx.reply("🎮 *ARENA VOLX*", Markup.inlineKeyboard([[Markup.button.callback('❓ Quiz', 'set_quiz')]]));
});

bot.action('set_quiz', ctx => ctx.editMessageText("🎯 Nível:", Markup.inlineKeyboard([[Markup.button.callback('🟢 Fácil', 'q_f')]])));

bot.command(['mods', 'modsgroup'], (ctx) => {
    if (ctx.message.text.startsWith('/modsgroup') && ctx.chat.type === 'private') return;
    let m = "📦 *MODS:* \n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: \`${mod.id}\`\n`);
    ctx.reply(m || "Vazio");
});

bot.launch();

