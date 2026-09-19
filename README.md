# RPG Discord Bot

Bot RPG inicial jogável para Discord, baseado no projeto enviado. Inclui perfil, economia, carteira/banco, aura, pesca, caça, mineração, fazenda, inventário, venda, transferências, rankings, PvP, punição e painel administrativo básico.

## Instalação

Requer Node.js 18 ou superior.

```bash
npm install
cp .env.example .env
```

Abra `.env` e preencha `DISCORD_TOKEN` e `CLIENT_ID`. O `GUILD_ID` é opcional, mas recomendado para registrar os comandos imediatamente no servidor de teste.

**Nunca cole o token no chat, GitHub ou em screenshots.** Se ele for exposto, regenere-o no Discord Developer Portal.

## Iniciar por 30 minutos

Linux/macOS:

```bash
timeout 30m npm start
```

Windows PowerShell:

```powershell
Start-Process npm -ArgumentList 'start' -NoNewWindow
Start-Sleep -Seconds 1800
```

Durante o período, mantenha o terminal aberto e conectado à internet. Os dados ficam em `data/rpg.json`.

## Comandos

`/perfil`, `/pescar`, `/cacar`, `/minerar`, `/plantar`, `/colher`, `/vender`, `/inventario`, `/aura`, `/depositar`, `/sacar`, `/dar`, `/ranking`, `/pvp` e `/admin`.

Esta é uma base funcional extensível; menus, botões de aceitar/recusar PvP, mercado detalhado, roubo, logs em canal e banco SQL podem ser adicionados na próxima etapa.
