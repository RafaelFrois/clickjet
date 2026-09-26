# ClickJet Remastered

Um jogo arcade em pixel art de sobrevivência no espaço, da **Domus Arcis**.
Pilote o foguete azul, pegue moedas, desvie de meteoros, rochas e aliens,
fuja do alien roxo e tente bater o seu próprio recorde.

> 🚀 VOAR → COLETAR → SOBREVIVER → FAZER PONTOS → MORRER → TENTAR NOVAMENTE

Esta é a recriação completa do ClickJet original: mesma identidade (fundo
preto estrelado, placas azuis pixeladas, GAME OVER vermelho, polvo verde
bravo, perseguidor roxo, bola de fogo laranja, rochas marrons), com
execução muito mais polida. Tudo é desenhado e sintetizado em código — sem
dependências em tempo de execução, sem servidor, sem login.

## Como jogar

| Plataforma | Controle |
|---|---|
| Mouse | o foguete segue o cursor |
| Teclado | setas ou WASD · `P`/`Esc` pausa · `M` mudo · `R` reinicia no Game Over · `Enter` confirma |
| Toque (celular) | arraste em qualquer lugar da tela — movimento relativo, o dedo nunca cobre o foguete |
| Gamepad | analógico / D-pad · A confirma · Start pausa |

| Objeto | O que é |
|---|---|
| 🟡 Moeda amarela | **+5** |
| 🌈 Moeda arco-íris | **+10** (mais rara, brilha) |
| ☄️ Meteoro arco-íris | **BÔNUS**: +10 pontos por segundo durante 6 s |
| ☄️ Meteoro de fogo | morte — sempre avisado por um marcador vermelho na borda |
| 🪨 Rocha | morte (deriva devagar, gira) |
| 👾 Alien verde | morte — flutua, e às vezes dá uma investida (tremida + olhos vermelhos antes) |
| 👾 Alien roxo | **o caçador**: entra com aviso roxo e persegue você por alguns segundos |

**Combos:** pegue moedas em sequência (janela de ~2,6 s) para multiplicar:
5 moedas = x2, 10 = x3, 15 = x4. **Formações** (linhas, arcos, ondas,
anéis orbitando rochas) dão **+20 CHAIN** se coletadas inteiras.
**Dica:** atraia o caçador roxo para um meteoro — ele fica atordoado.

Eventos raros: *METEOR SHOWER*, *COIN RUSH*, *INVASION*, *SUPER BONUS*
(+20/s) e *LUCKY STREAK*.

## Rodando

Não há build obrigatório — é HTML + JavaScript (ES modules).

```bash
npm start            # servidor local em http://localhost:8080
```

Versão de arquivo único (funciona até abrindo direto do disco, offline):

```bash
npm install          # só para o esbuild (dev)
npm run build        # gera dist/index.html (~120 KB) + manifest, ícones, service worker
```

### Publicar na Vercel

O repositório já vem configurado (`vercel.json`): a Vercel roda
`npm install` + `npm run build` e publica a pasta `dist/`.

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório
   `RafaelFrois/clickjet` (escolha a branch com o jogo, ou faça o merge na `main`).
2. Deixe *Framework Preset* como **Other** — build e pasta de saída vêm do
   `vercel.json`, não precisa mudar nada.
3. Clique em **Deploy**. Cada push gera um novo deploy automaticamente.

Pela linha de comando: `npx vercel` (preview) ou `npx vercel --prod`.

Outros hosts estáticos (GitHub Pages, Netlify, itch.io…): envie a pasta
`dist/` gerada pelo build. Em HTTPS o jogo vira um **PWA instalável** (celular e
desktop), abre em tela cheia/paisagem e funciona offline.

### Logo Domus Arcis

O menu desenha uma versão em pixel art da assinatura Domus Arcis no canto
inferior esquerdo. Para usar a arte original, salve-a como
`assets/domus-arcis.png` — ela é carregada automaticamente.

## Testes e ferramentas

```bash
npm test                     # testes unitários (node:test): save, pool, dificuldade,
                             # pontuação/combos, bônus, colisões, justiça dos spawns,
                             # determinismo, vazamento de objetos em partidas longas
npm run sim                  # simulação de balanceamento com bots (sem navegador)
npm run smoke                # Chromium: menu → jogo → pausa → morte → game over → restart → menu
node tools/touchcheck.mjs    # celular: toque real, arraste relativo, pausa, aviso de girar
node tools/audiocheck.mjs    # renderiza todas as músicas e efeitos offline e mede o nível
node tools/make-icons.mjs    # regenera os ícones a partir do sprite do foguete
```

As ferramentas de navegador usam o Playwright/Chromium instalado globalmente.
`tools/preview.html` mostra a folha de sprites.

## Arquitetura

```
src/
  config.js                 todo o balanceamento (curva de dificuldade em keyframes)
  Game.js                   máquina de estados + loop de passo fixo (120 Hz)
                            LOADING → MENU → PLAYING ⇄ PAUSED(→RESUMING) → DYING → GAME_OVER
  core/   Display           canvas 320x180 ampliado sem suavização (escala inteira quando possível)
          InputManager      mouse, toque, teclado, gamepad
          SaveManager       localStorage (recorde, melhor tempo, áudio) com fallback seguro
  game/   World             GameManager de uma partida (sem DOM — roda em Node)
          Player            PlayerController
          ScoreManager      pontos, combo, recorde
          SpawnManager      moedas, formações, rochas, meteoros, avisos, justiça
          EnemyManager      aliens verdes + caçador roxo
          PowerUpManager    bônus por segundo
          DifficultyManager interpola a curva de dificuldade
          EventManager      eventos raros
  fx/     FxDirector        partículas, popups, tremor, flash, hit-stop, SFX por evento
          Particles, FloatingText, Starfield (paralaxe em camadas)
  render/ WorldRenderer     desenho do mundo e marcadores de aviso
  gfx/    sprites, pixel (RotSprite), font (4 fontes bitmap), draw (placas/painéis), palette
  ui/     UIManager (botões, foco, transição), Menu, Options, HUD, Pause, GameOver
  audio/  AudioManager (único dono do áudio), Synth, Music (sequenciador + playlist), tracks, sfx
```

- **Simulação desacoplada:** o mundo só emite eventos (`coin`, `death`,
  `bonusStart`…); efeitos, som e UI reagem a eles. Isso permite simular
  milhares de partidas em Node para balancear.
- **Pooling:** moedas, meteoros, rochas, aliens, partículas e textos são
  reciclados — nada é alocado continuamente durante a partida.
- **Justiça:** meteoros sempre avisam (≥ 0,6 s) e nunca entram a menos de
  60 px do foguete; aliens e rochas nascem fora da tela e longe do jogador;
  o caçador é sempre mais lento que o foguete e gira com limite; hitboxes
  são um pouco menores que os sprites.
- **Trilha sonora original em chiptune**, sintetizada via Web Audio: tema do
  menu + 5 faixas de gameplay (*Nebula Run*, *Asteroid Alley*, *Purple
  Pursuit*, *Stardust Dash*, *Cosmic Drift*) tocadas em ordem embaralhada,
  sem repetir a anterior.

## Créditos

ClickJet © Domus Arcis — licença MIT (veja `LICENSE`).
