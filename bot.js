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

// --- LÓGICA IA VOLX FORMAL ---
const iaVolx = (text, userId) => {
    const isOwner = userId === OWNER_ID;
    const lowerText = text.toLowerCase();
    const assinatura = "\n\n━━━━━━━━━━━━━━━\n👑 *Dono:* br7 modz\n📢 *Grupo:* t.me/volxcheats";
    
    const proibido = ["crie", "faça", "gerar", "codigo", "code", "script", "hack"];
    if (proibido.some(p => lowerText.includes(p)) && !isOwner) {
        return "Prezado usuário, por diretrizes de segurança estabelecidas por **br7 modz**, não estou autorizada a gerar códigos ou scripts. Posso, contudo, auxiliar na compreensão teórica de erros em C++." + assinatura;
    }

    let respostaBase = "Estimado entusiasta, analisei sua solicitação sobre C++. ";
    if (lowerText.includes("ponteiro") || lowerText.includes("pointer")) {
        respostaBase += "Ponteiros são variáveis que armazenam endereços de memória. Sua correta manipulação é vital para a estabilidade do software.";
    } else if (lowerText.includes("erro") || lowerText.includes("ajuda")) {
        respostaBase += "Poderia fornecer o log de erro específico? Estarei pronta para analisar a sintaxe conforme as normas da linguagem.";
    } else {
        respostaBase += "Como posso servir à sua evolução em programação C++ nesta data?";
    }

    return respostaBase + assinatura;
};

// --- MIDDLEWARE DE FILTRO E REGISTRO ---
bot.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
        if (!groups.includes(ctx.chat.id)) { groups.push(ctx.chat.id); save(); }
    }
    const text = ctx.message?.text || "";
    const myCmds = ['/start', '/mods', '/ranking', '/link', '/games', '/modsgroup', '/comands', '/aviso', '/admin', '/unadmin', '/users', '/groups', '/enviar', '/delmod', '/iavolx', '/hist'];
    const isMyCmd = myCmds.some(c => text.startsWith(c));
    if (ctx.session?.step || isMyCmd) return next();
});

const hasPerm = (id, cmd) => (id === OWNER_ID || (admins[id] && admins[id].includes(cmd)));

// --- COMANDOS IA E HISTÓRICO ---

bot.command('iavolx', (ctx) => {
    const query = ctx.payload;
    if (!query) return ctx.reply("Formalmente solicito que envie sua dúvida após o comando. Ex: `/iavolx como funciona a memória?`", { parse_mode: 'Markdown' });
    ctx.reply(iaVolx(query, ctx.from.id), { parse_mode: 'Markdown' });
});

bot.command('hist', (ctx) => {
    if (!hasPerm(ctx.from.id, 'users')) return;
    const targetId = ctx.payload.trim();
    const u = users[targetId];
    if (!u) return ctx.reply("❌ Usuário não encontrado no banco de dados.");
    ctx.reply(`📑 *HISTÓRICO DO USUÁRIO*\n\n👤 *Nome:* ${u.nome}\n🆔 *ID:* \`${targetId}\`\n📈 *Referências:* ${u.ind}\n🛡️ *Cargo:* ${targetId == OWNER_ID ? "Dono" : (admins[targetId] ? "Admin" : "Membro")}`, { parse_mode: 'Markdown' });
});

// --- COMANDOS DONO / ADMIN ---
bot.command('comands', (ctx) => {
    const id = ctx.from.id;
    if (id === OWNER_ID) return ctx.reply("👑 *BEM-VINDO DONO BR7 MODZ*\n\n/admin /unadmin /aviso /users /groups /enviar /delmod /iavolx /hist [ID] /ranking", { parse_mode: 'Markdown' });
    if (admins[id]) return ctx.reply(`🛡️ *MENU ADMIN:* ${admins[id].join(', ')}`);
});

bot.command('aviso', async (ctx) => {
    if (!hasPerm(ctx.from.id, 'aviso')) return;
    const targets = [...Object.keys(users), ...groups];
    for (const t of targets) {
        try { await bot.telegram.sendMessage(t, `📢 *AVISO*\n\n${ctx.payload}`); await new Promise(r => setTimeout(r, 150)); } catch (e) {}
    }
    ctx.reply("✅ Aviso disparado!");
});

// --- SISTEMA ENVIAR (MODO 2 ETAPAS) ---
bot.command('enviar', (ctx) => {
    if (!hasPerm(ctx.from.id, 'enviar')) return;
    ctx.session = { step: 'WAIT_CONTENT' };
    ctx.reply("📤 *PASSO 1:* Envie o Arquivo ou Link.");
});

bot.on(['document', 'video', 'photo', 'text'], async (ctx, next) => {
    if (!ctx.session?.step) return next();
    if (ctx.session.step === 'WAIT_CONTENT') {
        const fileId = ctx.message.document?.file_id || ctx.message.video?.file_id || ctx.message.photo?.[0]?.file_id || null;
        ctx.session.content = fileId || ctx.message.text;
        ctx.session.step = 'WAIT_DESC';
        return ctx.reply("📝 *PASSO 2:* Envie a descrição do mod.");
    }
    if (ctx.session.step === 'WAIT_DESC') {
        const modId = 'VOLX-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        mods.push({ id: modId, cont: ctx.session.content, desc: ctx.message.text });
        save(); ctx.session = null;
        return ctx.reply(`✅ *MOD SALVO!* ID: \`${modId}\``, { parse_mode: 'Markdown' });
    }
});

// --- RANKING / START (TRAVA) ---
bot.start((ctx) => {
    const id = ctx.from.id, ref = ctx.payload;
    if (users[id]) return ctx.reply("⚠️ *ACESSO NEGADO:* Você já possui um registro ativo no sistema VOLX e não pode dar /start novamente.");
    
    users[id] = { nome: ctx.from.first_name, ind: 0 };
    if (ref && users[ref] && ref != id) { users[ref].ind++; save(); }
    save();
    ctx.reply("🚀 *VOLX CHEATS:* Registro efetuado com sucesso!");
});

bot.command('ranking', (ctx) => {
    const sorted = Object.entries(users).sort(([, a], [, b]) => b.ind - a.ind).slice(0, 10);
    let m = "🏆 *TOP 10 INDICADORES*\n\n";
    sorted.forEach(([id, u], i) => m += `${i == 0 ? "🥇" : "🔹"} *${u.nome}* — ${u.ind} refs\n`);
    ctx.reply(m, { parse_mode: 'Markdown' });
});

bot.command(['mods', 'modsgroup'], (ctx) => {
    if (ctx.message.text.startsWith('/modsgroup') && ctx.chat.type === 'private') return ctx.reply("❌ Apenas em grupos.");
    let m = "📦 *CATÁLOGO:* \n\n";
    mods.forEach(mod => m += `🔹 ${mod.desc} | ID: \`${mod.id}\`\n`);
    ctx.reply(m || "Vazio");
});

bot.command('groups', (ctx) => {
    if (!hasPerm(ctx.from.id, 'groups')) return;
    ctx.reply(`📡 Grupos: ${groups.length}\nIDs:\n${groups.join('\n')}`);
});

bot.command('link', (ctx) => ctx.reply(`🔗 Link: t.me/${ctx.botInfo.username}?start=${ctx.from.id}`));

bot.launch();

