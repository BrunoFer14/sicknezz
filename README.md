# Sicknezz

Jogo de cartas 1 vs 1 online, com o tema doenças. Funciona em tempo real, como o Clash Royale: ganhas mana a cada segundo e jogas cartas arrastando-as para o tabuleiro.

## Como correr

```bash
npm install
npm run dev
```

Abre http://localhost:5173 em dois separadores (ou em dois PCs da mesma rede, usando o IP que o Vite mostra no terminal). Num deles, cria uma sala. No outro, entra com o código.

Para produção: `npm run build` e depois `npm start`. O servidor fica em http://localhost:3001 e serve também o cliente.

## Regras

- 100 de vida. Perde quem chegar a 0 primeiro. Não há limite de tempo.
- Mana: começa em 0, máximo 10, +1 a cada 1,5 segundos.
- **Procurar adversário**: matchmaking automático. Conta para o ranking (pontos Elo, começa em 1000).
- **Criar sala / código**: partida amigável com um amigo. Conta para as estatísticas, mas não para os pontos.
- Se a ligação cair, tens 30 segundos para voltar (basta recarregar a página). Se não voltares, perdes.
- Ver uma carta em grande: passa o rato por cima (ou mantém o dedo em cima, no telemóvel).
- Cada jogador monta um baralho de 10 cartas diferentes no botão "Editar baralho". O baralho fica guardado no browser.
- Mão de 4 cartas. A carta jogada vai para o fim do baralho e entra a próxima.
- As doenças largam-se na área do adversário. Os tratamentos largam-se na tua área.
- Atalhos: as teclas 1–4 jogam a carta correspondente.

Estes valores estão em [shared/engine/config.ts](shared/engine/config.ts).

## Tipos de carta

| Tipo           | Estilo                                    | Cura           |
|----------------|-------------------------------------------|----------------|
| 🦠 Vírus       | dano ao longo do tempo                    | Vacina         |
| 🧫 Bactéria    | dano que escala com outras doenças        | Antibiótico    |
| 🍔 Física      | enfraquece de forma permanente (mana, vida) | Exercício    |
| 🧠 Mental      | ataca a mana                              | Terapia        |
| 💊 Tratamento  | cura e dá bónus a quem joga               | —              |

O Hospital cura doenças de todos os tipos.

Sinergias atuais:
- A Pneumonia faz mais dano por cada vírus ativo no adversário.
- A Diabetes faz mais dano por cada doença física ativa.
- A Sépsis faz mais dano por cada doença de qualquer tipo.
- A Vacina dá imunidade temporária a vírus.

Os tipos estão definidos em `CardType` ([types.ts](shared/engine/types.ts)) e `CARD_TYPES` ([cards.ts](shared/cards.ts)).

## Estrutura

```
shared/            código partilhado entre servidor e cliente
  cards.ts         ← AS CARTAS (só dados) + tipos + baralho por omissão
  engine/
    mechanics.ts   ← AS MECÂNICAS (os blocos com que as cartas são feitas)
    game.ts        motor: jogar carta, imunidade, tick, vitória
    stats.ts       cálculo dos stats (mana máx., regeneração...) com modificadores
    actions.ts     damage / heal / drainMana / countDiseases
    config.ts      valores base
  protocol.ts      mensagens cliente <-> servidor
server/
  index.ts         ligações, matchmaking, reconexão
  room.ts          uma partida (corre o jogo 20x por segundo)
  store.ts         estatísticas e ranking (PostgreSQL ou ficheiro)
client/src/
  game.ts          tabuleiro, drag & drop, histórico
  deckbuilder.ts   construtor de baralhos
  stats.ts         ecrã de estatísticas/ranking
  preview.ts       ver carta em grande
  sound.ts         sons (gerados, sem ficheiros)
  net.ts           ligação ao servidor com reconexão automática
```

O servidor é quem decide o resultado de cada jogada e valida os baralhos, por isso ninguém consegue fazer batota no browser.

## Adicionar uma carta nova

Em [shared/cards.ts](shared/cards.ts), adiciona uma entrada a `CARDS`. A carta aparece logo no construtor de baralhos.

```ts
sarampo: {
  name: 'Sarampo',
  emoji: '🔴',
  type: 'virus',
  cost: 5,
  description: 'Tira 10 de vida e o adversário perde 2 de mana.',
  target: 'opponent',
  effects: [
    { mechanic: 'damage', params: { amount: 10 } },
    { mechanic: 'drainMana', params: { amount: 2 } },
  ],
},
```

O TypeScript valida os `params` de cada mecânica, e o editor dá autocomplete. Uma carta pode ter vários efeitos. Cada efeito pode ter um `target` próprio, que tem prioridade sobre o da carta. Por exemplo, "roubar vida": dano ao adversário mais cura para ti.

## Mecânicas disponíveis

| Mecânica            | Params                                            | Exemplo               |
|---------------------|---------------------------------------------------|-----------------------|
| `damage`            | `amount`                                          | Salmonela             |
| `damagePerDisease`  | `base`, `per`, `type?`                            | Pneumonia, Sépsis     |
| `heal`              | `amount`                                          | Exercício             |
| `damageOverTime`    | `amount`, `duration`                              | Gripe, Covid          |
| `healOverTime`      | `amount`, `duration`                              | Vitaminas             |
| `infection`         | `perSecond`, `total?`, `cureChance?`              | Ébola, Herpes         |
| `statModifier`      | `stat`, `op` (add/mul/set), `value`, `duration?`  | Obesidade, Asma, Café |
| `drainMana`         | `amount`                                          | Enxaqueca             |
| `drainManaOverTime` | `amount`, `duration`                              | Ansiedade             |
| `cleanse`           | `types?`                                          | Vacina, Exercício     |
| `immunity`          | `types`, `duration`                               | Vacina                |

Stats que se podem modificar: `maxHp`, `maxMana`, `manaRegen`. Se o `statModifier` não tiver `duration`, o efeito é permanente. O mesmo acontece com o `infection` sem `total`.

## Adicionar uma mecânica nova

Em [shared/engine/mechanics.ts](shared/engine/mechanics.ts), adiciona uma entrada a `MECHANICS`. Uma mecânica pode definir:

- `duration(params)`: se não existir, o efeito é instantâneo. Se existir, o efeito fica ativo no jogador (`null` = para sempre).
- `modifiers(params)`: modificadores de stats enquanto o efeito está ativo.
- `blocks(params)`: tipos de carta a que o jogador fica imune.
- `onApply`, `onTick(dt)`, `onExpire`: código que corre quando o efeito começa, a cada tick e quando acaba. No `onTick`, `effect.ended = true` termina o efeito mais cedo.

Um stat novo (por exemplo `armor`) acrescenta-se em `StatName` ([types.ts](shared/engine/types.ts)) e em `CONFIG.baseStats`.

## Publicar online (Render, gratuito)

O projeto já traz o [render.yaml](render.yaml).

1. Põe o projeto num repositório do GitHub.
2. Em https://render.com, entra com a conta do GitHub e escolhe **New → Blueprint**.
3. Escolhe o repositório e confirma. O Render instala, faz o build e dá-te um link `https://sicknezz-xxxx.onrender.com`.
4. Sempre que fizeres push para o GitHub, o site é atualizado automaticamente.

No plano gratuito, o servidor adormece após 15 minutos sem jogadores. O primeiro acesso depois disso demora cerca de 1 minuto a arrancar.

### Guardar as estatísticas e o ranking

Não há contas: cada browser recebe uma identidade anónima, guardada no próprio browser. Se o jogador limpar os dados do browser, começa um perfil novo.

- Sem configuração, os dados ficam em `data/db.json`. **No Render gratuito este ficheiro perde-se sempre que o servidor reinicia.**
- Para guardar para sempre, cria uma base de dados PostgreSQL gratuita em https://neon.tech e copia a "connection string" (`postgresql://...`). No Render, vai ao serviço e escolhe **Environment → Add Environment Variable**. O nome é `DATABASE_URL` e o valor é essa connection string. As tabelas são criadas automaticamente.
