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

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
};

// --- LÓGICA IA VOLX AVANÇADA ---
const iaVolxEngine = (text, userId) => {
    const isOwner = userId === OWNER_ID;
    const lowerText = text.toLowerCase();
    const assinatura = "\n\n━━━━━━━━━━━━━━━\n👑 *Dono:* br7 modz\n📢 *Grupo:* t.me/volxcheats";
    
    // Filtro de segurança para códigos (Apenas Dono ignora)
    const restrito = ["crie", "gerar", "script", "hack", "fazer codigo"];
    if (restrito.some(p => lowerText.includes(p)) && !isOwner) {
        return "Estimado usuário, sob ordens diretas de **br7 modz**, minha arquitetura impede a geração de scripts ou códigos prontos para terceiros. Posso, contudo, instruí-lo na lógica de C++, Java ou gestão de projetos." + assinatura;
    }

    // Base de Conhecimento Adaptativa
    if (lowerText.includes("c++") || lowerText.includes("ponteiro")) {
        return "No âmbito de C++, a gestão de memória via ponteiros e referências é o pilar da performance. Recomendo o estudo de Smart Pointers para evitar 'memory leaks'." + assinatura;
    } 
    if (lowerText.includes("java") || lowerText.includes("projeto")) {
        return "Para o desenvolvimento em Java ou gestão de projetos, a organização via Gradle ou Maven é essencial para manter a integridade das dependências e o fluxo de trabalho." + assinatura;
    }
    
    return "Como assistente formal do sistema VOLX, estou processando sua solicitação sobre conhecimentos gerais e modding. Em que mais posso ser útil à sua jornada hoje?" + assinatura;
};

// --- MIDDLEWARE DE SEGURANÇA E RESPOSTA DIRETA ---
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    }

    // Se o usuário responder (reply) a uma mensagem da IA, ela atende na hora
    if (ctx.message?.reply_to_message?.from?.id === ctx.botInfo.id) {
        const resp = iaVolxEngine(ctx.message.text, ctx.from.id);
        return ctx.reply(resp, { parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id });
    }

    const text = ctx.message?.text || "";
    const myCmds = ['/start', '/mods', '/ranking', '/link', '/games', '/modsgroup', '/comands', '/aviso', '/admin', '/unadmin', '/users', '/groups', '/enviar', '/delmod', '/iavolx', '/hist'];
    if (ctx.session?.step || myCmds.some(c => text.startsWith(c))) return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS IA E GESTÃO ---

bot.command('iavolx', (ctx) => {
    const query = ctx.payload;
    if (!query) return ctx.reply("Prezado, por favor, formule sua questão após o comando. Exemplo: `/iavolx como organizar um projeto Java?`", { parse_mode: 'Markdown' });
    ctx.reply(iaVolxEngine(query, ctx.from.id), { parse_mode: 'Markdown' });
});

bot.command('hist', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    const targetId = ctx.payload.trim();
    const u = users[targetId];
    if (!u) return ctx.reply("Usuário inexistente no banco de dados.");
    ctx.reply(`📑 *HISTÓRICO:* \n\n👤 *Nome:* ${u.nome}\n📈 *Refs:* ${u.ind}\n🆔 *ID:* \`${targetId}\``, { parse_mode: 'Markdown' });
});

// --- SISTEMA DE START ÚNICO ---
bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (users[id]) return ctx.reply("⚠️ *NOTIFICAÇÃO:* Você já possui um registro na base de dados VOLX. O comando /start é permitido apenas uma única vez.");
    
    users[id] = { nome: ctx.from.first_name, ind: 0 };
    if (ref && users[ref] && ref != id) { users[ref].ind++; save(); }
    save();
    ctx.reply("🚀 *VOLX CHEATS:* Registro efetuado com sucesso em nosso sistema.");
});

// --- COMANDOS ADMINISTRATIVOS E ENVIAR ---
bot.command('comands', (ctx) => {
    if (ctx.from.id === OWNER_ID) return ctx.reply("👑 *DONO BR7 MODZ:* /admin, /unadmin, /aviso, /users, /groups, /enviar, /delmod, /iavolx, /hist");
    if (admins[ctx.from.id]) return ctx.reply(`🛡️ *ADMIN:* ${admins[ctx.from.id].join(', ')}`);
});

bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.session = { step: 'WAIT_CONTENT' };
    ctx.reply("📤 *PASSO 1:* Envie o arquivo ou link do mod.");
});

bot.on(['document', 'video', 'photo', 'text'], async (ctx, next) => {
    if (!ctx.session?.step) return next();
    if (ctx.session.step === 'WAIT_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.photo?.[0]?.file_id || null;
        ctx.session.content = fileId || ctx.message.text;
        ctx.session.step = 'WAIT_DESC';
        return ctx.reply("📝 *PASSO 2:* Informe a descrição formal do mod.");
    }
    if (ctx.session.step === 'WAIT_DESC') {
        const modId = 'VOLX-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        mods.push({ id: modId, cont: ctx.session.content, desc: ctx.message.text });
        save(); ctx.session = null;
        return ctx.reply(`✅ *MOD REGISTRADO:* ID \`${modId}\``, { parse_mode: 'Markdown' });
    }
});

// --- RANKING E OUTROS ---
bot.command('ranking', (ctx) => {
    const sorted = Object.entries(users).sort(([, a], [, b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *RANKING DE INDICADORES:*\n\n";
    sorted.forEach(([id, u], i) => m += `${i == 0 ? "🥇" : "🔹"} *${u.nome}* — ${u.ind} refs\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    if (ctx.message.text.startsWith('/modsgroup') && ctx.chat.type === 'private') return ctx.reply("Comando restrito a grupos.");
    let m = "📦 *CATÁLOGO:* \n\n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: \`${mod.id}\`\n`);
    ctx.reply(m || "Vazio");
});

bot.launch();

