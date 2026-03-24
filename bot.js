const { Telegraf, session } = require('telegraf');
const http = require('http');

// Servidor para manter o Render/Hospedagem Online
http.createServer((req, res) => { 
    res.writeHead(200); 
    res.end('VOLX_OK'); 
}).listen(process.env.PORT || 8080);

const BOT_TOKEN = '8656194039:AAHO8K0IvqYND9zh0_rCVWGe1o3U270dSNw';
const OWNER_ID = 7823943091; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const listaMods = `📂 **MODS VOLX CHEATS:**\n\n• Regedit Mobile Free\n• Aimlock 50%\n• Script Basic v1\n\nChame @Volxcheatsofc para suporte ou VIP.`;

// --- 🛡️ TRAVA DE SEGURANÇA E FILTRO ---
bot.use((ctx, next) => {
    if (!ctx.from || !ctx.chat) return;

    const id = ctx.from.id;
    const isGroup = ctx.chat.type.includes('group');

    // LIBERADO EM GRUPO: Tudo (Start, Modsgroup, Games, ID)
    if (isGroup) return next();

    // NO PRIVADO: Dono passa tudo. Outros SÓ passam se for /start
    if (id !== OWNER_ID) {
        if (ctx.message?.text?.startsWith('/start')) return next();
        return; // Silêncio total para o resto no PV
    }
    return next();
});

// --- COMANDOS ---

// Start unificado (Instruções que o Menu daria)
bot.start((ctx) => {
    const msg = `🚀 **BOT VOLX ONLINE!**\n\n` +
                `🛠️ **COMANDOS DISPONÍVEIS:**\n` +
                `• /mods - Ver arquivos VIP (PV)\n` +
                `• /modsgroup - Ver arquivos Free (Grupo)\n` +
                `• /games - Diversão e Mini-games\n` +
                `• /id - Ver seu ID de usuário\n\n` +
                `👑 **SUPORTE:** @Volxcheatsofc`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Mods e Modsgroup (Mesma função)
bot.command(['mods', 'modsgroup'], (ctx) => {
    ctx.reply(listaMods, { parse_mode: 'Markdown' });
});

bot.command('id', (ctx) => {
    ctx.reply(`🆔 Seu ID: \`${ctx.from.id}\`\n👥 Chat ID: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' });
});

bot.command('games', (ctx) => {
    ctx.reply("🎮 **GAMES VOLX:**\n\n/quiz - Iniciar Desafio\n/velha - Jogar contra o bot");
});

// Menu secreto para o Dono
bot.command('comands', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    ctx.reply("👑 **PAINEL DO DONO:**\n\n/aviso [texto] - Enviar alerta\n/stats - Ver status do sistema", { parse_mode: 'Markdown' });
});

bot.command('aviso', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return;
    const aviso = ctx.payload;
    if (!aviso) return ctx.reply("❌ Use: /aviso [mensagem]");
    ctx.reply(`📢 **AVISO VOLX:**\n\n${aviso}`, { parse_mode: 'Markdown' });
});

bot.catch((err) => console.error('Erro no Bot:', err));

bot.launch().then(() => console.log("🚀 Bot Volx 100% Ativo!"));

