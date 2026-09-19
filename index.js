require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  EmbedBuilder, PermissionFlagsBits
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || '';
if (!TOKEN || !CLIENT_ID) throw new Error('Defina DISCORD_TOKEN e CLIENT_ID no arquivo .env');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'rpg.json');
fs.mkdirSync(dataDir, { recursive: true });
let db = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : { users: {}, logs: [] };
const save = () => fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
const now = () => Date.now();
const money = n => `$${Math.floor(n).toLocaleString('pt-BR')}`;
const user = (id, name) => db.users[id] ||= { id, name, level: 1, xp: 0, cash: 1000, bank: 0, aura: 0, hp: 100, attack: 10, defense: 10, luck: 5, inventory: [], stats: { fishing: 0, hunting: 0, mining: 0, farming: 0, wins: 0 }, cooldowns: {}, punishment: 0, crops: [] };
function log(action, actor, details = {}) { db.logs.push({ at: new Date().toISOString(), action, actor, ...details }); if (db.logs.length > 1000) db.logs.shift(); save(); }
function blocked(p) { return p.punishment > now() ? Math.ceil((p.punishment - now()) / 86400000) : 0; }
function cd(p, key, minutes) { const until = p.cooldowns[key] || 0; if (until > now()) return Math.ceil((until - now()) / 60000); p.cooldowns[key] = now() + minutes * 60000; return 0; }
function addXp(p, amount) { p.xp += amount; while (p.xp >= p.level * 1000) { p.xp -= p.level * 1000; p.level++; p.attack += 2; p.defense += 1; } }
function pick(items) { return items[Math.floor(Math.random() * items.length)]; }
function rarity() { const r = Math.random(); return r < .55 ? 'Comum' : r < .78 ? 'Incomum' : r < .93 ? 'Raro' : r < .985 ? 'Épico' : r < .998 ? 'Lendário' : 'Mítico'; }
const fish = [['Sardinha','Comum',120],['Tilápia','Comum',180],['Traíra','Incomum',300],['Tucunaré','Incomum',1240],['Salmão Dourado','Raro',2500],['Peixe Dragão','Épico',8000],['Leviatã','Lendário',25000],['Peixe Celestial','Mítico',100000]];
const hunt = [['Coelho','Comum',100],['Raposa','Incomum',350],['Javali','Raro',900],['Lobo Alfa','Épico',3000],['Urso Gigante','Lendário',9000],['Criatura ancestral','Mítico',30000]];
const ores = [['Pedra','Comum',40],['Carvão','Comum',100],['Ferro','Incomum',250],['Ouro','Raro',1200],['Diamante','Épico',5000],['Cristal Arcano','Lendário',18000],['Núcleo Primordial','Mítico',100000]];
const crops = { maca: ['Maçã', 400, 5], laranja: ['Laranja', 500, 6], uva: ['Uva', 700, 8], morango: ['Morango', 900, 10], cenoura: ['Cenoura', 300, 4], milho: ['Milho', 450, 6], trigo: ['Trigo', 350, 5] };

const commands = [
 new SlashCommandBuilder().setName('perfil').setDescription('Mostra seu perfil RPG'),
 new SlashCommandBuilder().setName('pescar').setDescription('Pesca um peixe'),
 new SlashCommandBuilder().setName('cacar').setDescription('Caça um animal'),
 new SlashCommandBuilder().setName('minerar').setDescription('Busca minérios'),
 new SlashCommandBuilder().setName('plantar').setDescription('Planta uma semente').addStringOption(o=>o.setName('semente').setDescription('Tipo de semente').setRequired(true).addChoices(...Object.keys(crops).map(k=>({name:crops[k][0],value:k})))),
 new SlashCommandBuilder().setName('colher').setDescription('Colhe plantações prontas'),
 new SlashCommandBuilder().setName('vender').setDescription('Vende itens do inventário'),
 new SlashCommandBuilder().setName('inventario').setDescription('Mostra seu inventário'),
 new SlashCommandBuilder().setName('aura').setDescription('Mostra sua aura'),
 new SlashCommandBuilder().setName('depositar').setDescription('Deposita dinheiro').addIntegerOption(o=>o.setName('valor').setDescription('Valor').setRequired(true).setMinValue(1)),
 new SlashCommandBuilder().setName('sacar').setDescription('Saca dinheiro').addIntegerOption(o=>o.setName('valor').setDescription('Valor').setRequired(true).setMinValue(1)),
 new SlashCommandBuilder().setName('ranking').setDescription('Mostra ranking').addStringOption(o=>o.setName('tipo').setDescription('Categoria').setRequired(true).addChoices(
  {name:'Riqueza',value:'riqueza'},{name:'Nível',value:'nivel'},{name:'Aura',value:'aura'},{name:'Pesca',value:'pesca'},{name:'Caça',value:'caca'},{name:'Mineração',value:'mineração'},{name:'PvP',value:'pvp'})),
 new SlashCommandBuilder().setName('dar').setDescription('Transfere dinheiro').addUserOption(o=>o.setName('usuario').setDescription('Destinatário').setRequired(true)).addIntegerOption(o=>o.setName('valor').setDescription('Valor').setRequired(true).setMinValue(1)),
 new SlashCommandBuilder().setName('pvp').setDescription('Desafia outro jogador').addUserOption(o=>o.setName('usuario').setDescription('Oponente').setRequired(true)),
 new SlashCommandBuilder().setName('admin').setDescription('Consulta logs administrativos').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c=>c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
async function register() { const rest = new REST({ version: '10' }).setToken(TOKEN); const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID); await rest.put(route, { body: commands }); }
function embed(title, description, color=0x5865f2) { return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp(); }

client.once('ready', () => console.log(`RPG online como ${client.user.tag}`));
client.on('interactionCreate', async i => {
 if (!i.isChatInputCommand()) return;
 const p = user(i.user.id, i.user.username); p.name = i.user.username;
 if (i.commandName !== 'perfil' && i.commandName !== 'ranking' && i.commandName !== 'inventario' && i.commandName !== 'aura' && i.commandName !== 'admin') { const days = blocked(p); if (days) return i.reply({ embeds: [embed('💀 Comandos bloqueados', `Você está punido por derrota em PvP por mais **${days} dia(s)**.`, 0xed4245)], ephemeral: true }); }
 try {
  if (i.commandName === 'perfil') return i.reply({ embeds: [embed(`👤 ${p.name}`, `⭐ Nível: **${p.level}**\n✨ XP: **${p.xp}/${p.level*1000}**\n\n💰 Carteira: **${money(p.cash)}**\n🏦 Banco: **${money(p.bank)}**\n🔮 Aura: **${p.aura}**\n❤️ Vida: **${p.hp}/100**\n⚔️ Ataque: **${p.attack}**\n🛡️ Defesa: **${p.defense}**\n🍀 Sorte: **${p.luck}**\n\n🎣 Pesca: ${p.stats.fishing} | 🦌 Caça: ${p.stats.hunting}\n⛏️ Mineração: ${p.stats.mining} | 🌱 Fazenda: ${p.stats.farming}`)] });
  if (i.commandName === 'inventario') return i.reply({ embeds: [embed('🎒 Inventário', p.inventory.length ? p.inventory.map((x,n)=>`${n+1}. ${x.name} — ${money(x.value)}`).join('\n') : 'Seu inventário está vazio.')] });
  if (i.commandName === 'aura') return i.reply({ embeds: [embed('🔮 Aura', `Você possui **${p.aura}** aura.\n\n1.000 aura — ${money(75000)}\n5.000 aura — ${money(350000)}\n10.000 aura — ${money(650000)}`)] });
  if (i.commandName === 'pescar' || i.commandName === 'cacar' || i.commandName === 'minerar') {
   const type = i.commandName === 'pescar' ? 'fishing' : i.commandName === 'cacar' ? 'hunting' : 'mining'; const mins = type==='fishing'?10:type==='hunting'?12:15; const wait = cd(p,type,mins); if(wait) return i.reply({content:`⏳ Aguarde mais ${wait} minuto(s).`,ephemeral:true});
   const pool = type==='fishing'?fish:type==='hunting'?hunt:ores; const [name, rar, value] = pick(pool); const item={name, rarity:rar, value}; p.inventory.push(item); p.stats[type]++; addXp(p,100); log(type,i.user.id,{item:name}); return i.reply({embeds:[embed(type==='fishing'?'🎣 Pesca realizada':type==='hunting'?'🦌 Caça realizada':'⛏️ Mineração',`Você encontrou **${name}**!\n⭐ Raridade: **${rar}**\n💰 Valor: **${money(value)}**\n\nO item foi guardado no inventário.`)]});
  }
  if (i.commandName === 'plantar') { const key=i.options.getString('semente'); const c=crops[key]; const wait=cd(p,'farm',1); if(wait)return i.reply({content:`⏳ Aguarde ${wait} minuto(s) para plantar novamente.`,ephemeral:true}); p.crops.push({name:c[0], value:c[1], ready:now()+c[2]*60000}); p.stats.farming++; return i.reply({embeds:[embed('🌱 Plantação criada',`Sua plantação de **${c[0]}** está crescendo.\n⏱️ Pronta em **${c[2]} minutos**.`)]}); }
  if (i.commandName === 'colher') { const ready=p.crops.filter(x=>x.ready<=now()); if(!ready.length)return i.reply({content:'🌱 Ainda não há plantações prontas.',ephemeral:true}); ready.forEach(x=>p.inventory.push({name:x.name,value:x.value,rarity:'Comum'})); p.crops=p.crops.filter(x=>x.ready>now()); save(); return i.reply({embeds:[embed('🌾 Colheita realizada',`Você colheu: ${ready.map(x=>x.name).join(', ')}.`)]}); }
  if (i.commandName === 'vender') { if(!p.inventory.length)return i.reply({content:'🎒 Seu inventário está vazio.',ephemeral:true}); const total=p.inventory.reduce((s,x)=>s+x.value,0); p.cash+=total; const count=p.inventory.length; p.inventory=[]; log('venda',i.user.id,{total}); return i.reply({embeds:[embed('💰 Venda concluída',`Você vendeu **${count} item(ns)** por **${money(total)}**.`)]}); }
  if (i.commandName === 'depositar' || i.commandName === 'sacar') { const v=i.options.getInteger('valor'); if(i.commandName==='depositar'){if(p.cash<v)return i.reply({content:'❌ Saldo insuficiente.',ephemeral:true});p.cash-=v;p.bank+=v;}else{if(p.bank<v)return i.reply({content:'❌ Saldo bancário insuficiente.',ephemeral:true});p.bank-=v;p.cash+=v;} save(); return i.reply(`✅ Operação concluída. Carteira: ${money(p.cash)} | Banco: ${money(p.bank)}`); }
  if (i.commandName === 'dar') { const target=i.options.getUser('usuario'); const v=i.options.getInteger('valor'); if(target.id===i.user.id)return i.reply({content:'❌ Você não pode transferir para si mesmo.',ephemeral:true}); if(p.cash<v)return i.reply({content:'❌ Saldo insuficiente.',ephemeral:true}); const t=user(target.id,target.username);p.cash-=v;t.cash+=v;log('transferencia',i.user.id,{target:target.id,value:v});return i.reply(`🎁 Você transferiu **${money(v)}** para **${target.username}**.`); }
  if (i.commandName === 'ranking') { const type=i.options.getString('tipo'); const list=Object.values(db.users).sort((a,b)=>{const val=x=>type==='riqueza'?x.cash+x.bank:type==='nivel'?x.level:type==='aura'?x.aura:type==='pesca'?x.stats.fishing:type==='caca'?x.stats.hunting:type==='mineração'?x.stats.mining:x.stats.wins;return val(b)-val(a)}).slice(0,10);return i.reply({embeds:[embed(`🏆 Ranking: ${type}`,list.map((x,n)=>`${n+1}. **${x.name}** — ${type==='riqueza'?money(x.cash+x.bank):type==='nivel'?x.level:type==='aura'?x.aura:x.stats[type==='mineração'?'mining':type]}`).join('\n')||'Ainda sem jogadores.') ]}); }
  if (i.commandName === 'pvp') { const target=i.options.getUser('usuario'); if(target.id===i.user.id)return i.reply({content:'❌ Você não pode desafiar a si mesmo.',ephemeral:true}); const t=user(target.id,target.username); const win=Math.random() < .5 + (p.attack-t.attack)/100; p.stats.wins += win?1:0; t.stats.wins += win?0:1; if(!win)p.punishment=now()+7*86400000; log('pvp',i.user.id,{target:target.id,win}); return i.reply({embeds:[embed('⚔️ Batalha PvP',win?`**${p.name}** venceu **${t.name}**!`:`**${t.name}** venceu **${p.name}**!\n${p.name} ficará bloqueado por 7 dias.`,win?0x57f287:0xed4245)]}); }
  if (i.commandName === 'admin') { if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild))return i.reply({content:'❌ Sem permissão.',ephemeral:true}); return i.reply({embeds:[embed('🛠️ Painel administrativo',`Usuários: **${Object.keys(db.users).length}**\nLogs registrados: **${db.logs.length}**\nBanco local: ativo`)]}); }
 } catch(e) { console.error(e); if(!i.replied) i.reply({content:'❌ Ocorreu um erro inesperado.',ephemeral:true}); }
 save();
});
register().then(()=>client.login(TOKEN)).catch(console.error);
