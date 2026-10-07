// Patch notes: o que mudou em cada versão (a mais recente primeiro). Para uma versão nova, junta uma entrada no topo.
import { escapeHtml } from './card';

/** Uma linha das notas: texto simples, ou uma alteração "antes → agora". */
type NoteItem = string | { name: string; before: string; after: string };

interface PatchNote {
  version: string;
  date: string;
  title: string;
  sections: { title: string; items: NoteItem[] }[];
}

/** Atalho para uma alteração "antes → agora". */
const change = (name: string, before: string, after: string): NoteItem => ({ name, before, after });

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.14',
    date: '07/10/2026',
    title: 'Sono e mutações',
    sections: [
      {
        title: '🃏 Cartas novas',
        items: [
          '😨 Hipocondria (Mental, 3): o próximo tratamento do adversário não faz nada — gasta a energia e a carta. Dura até ele jogar um tratamento (até a Terapia e o Hospital são gastos por ela).',
          '😱 Pesadelos (Sintoma, 1): só se o adversário tiver uma doença Mental. Tira 3 de vida por cada doença Mental dele.',
          '😴 Dormir (Tratamento, 3): curas as doenças Mentais, mas durante 4s não podes jogar nada. Ao acordar ganhas 5 de energia.',
          '🧬 Variante (Vírus, 4): só se o adversário tiver um vírus. Todos os vírus dele voltam ao início, com a duração e o dano completos (menos os permanentes).',
          '🫨 Tremores (Estado, 2): durante 12s, cada carta de custo 2 ou menos que o adversário jogue tira-lhe 4 de vida. É a resposta a quem roda o baralho com cartas baratas — o contrário da Hérnia.',
        ],
      },
      {
        title: '☕ Café a mais tira o sono',
        items: [
          change('Café', 'ganhas 4 de energia em 6s', 'quem o bebe ganha 3 de energia em 6s e +1 ☕; ao 3.º ☕ fica com Insónia'),
          'Tal como o Hambúrguer, podes largá-lo na tua área para beberes ou na do adversário para lhe dares — dar-lhe o 3.º café deixa-o com Insónia.',
          'A Terapia, o Dormir e o Hospital curam a Insónia e também repõem o contador ☕.',
        ],
      },
      {
        title: '⚖️ Equilíbrio',
        items: [
          'Os baralhos de rampa de energia (Café + Bebida + Hambúrguer) ganhavam quase tudo: rodavam o baralho e ainda ficavam com mais energia. Agora cada um dá só +1 de energia líquida.',
          change('Bebida Energética', 'ganhas 3 de energia', 'ganhas 2 de energia'),
          change('Hambúrguer', 'quem o come ganha 4 de energia', 'quem o come ganha 3 de energia'),
          change('Ébola', 'até 100 de dano (com a SIDA podia chegar a 200)', 'até 60 de dano, já a contar com a SIDA'),
        ],
      },
    ],
  },
  {
    version: '0.13',
    date: '07/10/2026',
    title: 'Sem prisões de energia',
    sections: [
      {
        title: '🧘 Resiliência (regra nova)',
        items: [
          'Depois de perderes energia por um dreno (Enxaqueca, Ansiedade, Burnout…), ficas 8s com Resiliência: o dreno seguinte só te tira metade, e o outro a seguir um quarto. Vê-se nos teus efeitos.',
          'Um dreno de vez em quando continua a doer; uma cadeia de drenos já não te deixa preso sem energia o resto do jogo.',
        ],
      },
      {
        title: '⚖️ Equilíbrio',
        items: [
          'Os abrandamentos da energia já não acumulam: com Insónia, Asma, Sedentarismo ou Depressão ao mesmo tempo, só conta o mais forte.',
          change('Enxaqueca', 'tira 3 de energia', 'tira 2 de energia'),
          change('Ansiedade', 'tira 3 de energia em 10s', 'tira 2 de energia em 10s'),
          change('Burnout', 'perdes a energia acima de 4', 'perdes a energia acima de 5'),
        ],
      },
    ],
  },
  {
    version: '0.12',
    date: '06/10/2026',
    title: 'Hambúrguer',
    sections: [
      {
        title: '🃏 Cartas novas',
        items: [
          '🍔 Hambúrguer (Física, 2): quem o come ganha 4 de energia e +1 🍔. Ao 3.º 🍔 fica com Obesidade. Larga-o na tua área para comeres, ou na do adversário para o alimentares — dar-lhe o último hambúrguer deixa-o obeso.',
          'O contador 🍔 vê-se nos efeitos de cada jogador (1/3, 2/3…). A Fisioterapia e o Hospital curam a Obesidade e também repõem o contador.',
          '🏋️ Hérnia (Estado, 3): até ser curada, cada carta de custo 4 ou mais que o adversário jogue tira-lhe 3 de vida. Fazer força demais dói.',
        ],
      },
      {
        title: '❤️ Barra de vida',
        items: ['Quando a vida máxima desce (Hipertensão), a parte perdida aparece às riscas no fim da barra e o máximo fica a vermelho.'],
      },
      {
        title: '⚖️ Alterações',
        items: [
          change('Obesidade', 'carta jogável (4): energia máxima do adversário −2', 'já não entra nos baralhos: só se apanha comendo Hambúrgueres'),
          'Baralhos guardados com a Obesidade ficam incompletos: troca-a por outra carta (o Hambúrguer, por exemplo).',
        ],
      },
      {
        title: '🐛 Correções',
        items: ['Construtor de baralhos: a barra das abas desaparecia na aba "Todas".'],
      },
    ],
  },
  {
    version: '0.11',
    date: '06/10/2026',
    title: 'Abas no baralho',
    sections: [
      {
        title: '🃏 Cartas novas',
        items: [
          '🤢 Vómitos (Sintoma, 1): só se o adversário tiver um vírus ou bactéria. Uma carta ao acaso da mão dele vai para o fim da fila e entra a próxima.',
          '🤯 Dor de Cabeça (Sintoma, 1): só se o adversário tiver um vírus ou bactéria. A próxima carta dele custa +1 de energia.',
        ],
      },
      {
        title: '🔗 Partilhar baralhos',
        items: [
          'No construtor há agora "📋 Copiar código" e "📥 Colar código": copia o código do teu baralho e manda-o a um amigo, que o cola para ficar com as mesmas cartas.',
        ],
      },
      {
        title: '🃏 Construtor de baralhos',
        items: [
          'As cartas aparecem agora separadas em abas por classe (🦠 Vírus, 🧫 Bactéria, 🍔 Física, 🩹 Estado, 🧠 Mental, 💢 Sintoma, 💊 Tratamento), com uma aba 📚 Todas no fim.',
          'Cada aba mostra quantas cartas dessa classe já tens no baralho.',
          'A pesquisa procura em todas as classes e mostra os resultados agrupados por classe.',
        ],
      },
    ],
  },
  {
    version: '0.10',
    date: '29/09/2026',
    title: 'Bebida Energética',
    sections: [
      {
        title: '🃏 Cartas novas',
        items: [
          '🥤 Bebida Energética (Tratamento, 1): ganhas 3 de energia de imediato. A partir da 2.ª bebida na mesma partida, cada uma tira-te o dobro da vida da anterior — 2, 4, 8, 16… Energia rápida, mas beber demais faz mal.',
        ],
      },
    ],
  },
  {
    version: '0.9',
    date: '29/09/2026',
    title: 'Respostas',
    sections: [
      {
        title: '💊 Tratamentos mais simples',
        items: [
          'Os tratamentos passam de 13 para 8: cada cura cobre uma família de doenças, para não ficarem cartas mortas na mão.',
          change('Antibiótico + Antiviral', 'curar bactérias / metade do dano dos vírus', '💊 Medicação (3): cura todos os vírus e bactérias (menos os permanentes)'),
          change('Exercício + Repouso', 'curar Físicas / curar Estados', '🩺 Fisioterapia (3): cura todas as Físicas e os Estados'),
          change('Terapia + Psicólogo', 'curar Mentais / imunidade a Mentais 8s', '🧘 Terapia (3): cura as Mentais e fica imune a novas durante 5s'),
          change('Hospital', 'cura vírus e bactérias e +8 de vida', 'cura todas as doenças (menos as permanentes) e +8 de vida'),
          change('Vacina + Máscara', 'imune a vírus 7s (custo 3) / imune a vírus e bactérias 3s (custo 2)', '💉 Vacina (3): imune a vírus e bactérias durante 6s'),
          change('Vitaminas + Soro', 'custo 3 · 6 de vida em 10s / custo 4 · 4 de vida e 2 de energia', '🍊 Vitaminas (2): 6 de vida em 8s'),
          change('Café', '3 de energia em 6s', '4 de energia em 6s'),
        ],
      },
      {
        title: '⚖️ Equilíbrio',
        items: [
          change('Regeneração mínima de energia', '50% da normal', '55% da normal'),
          change('Fratura', 'só cartas até custo 4 e sem Exercício durante 10s', 'só cartas até custo 4 durante 10s (o Exercício saiu do jogo)'),
        ],
      },
      {
        title: '🃏 Cartas novas',
        items: ['💥 Enfarte (Física, 5): tira 10 de vida, ou 20 se o adversário tiver menos de 40 de vida — o golpe final.'],
      },
      {
        title: '📦 Baralhos',
        items: ['Os baralhos guardados que tinham cartas que saíram ficam marcados como incompletos no lobby — é só completá-los.'],
      },
    ],
  },
  {
    version: '0.8',
    date: '29/09/2026',
    title: 'Sintomas',
    sections: [
      {
        title: '💢 Classe nova: Sintoma',
        items: [
          'Cartas baratas que só se podem jogar se o adversário já tiver certa doença ativa — e que a pioram.',
          'Na mão, um sintoma aparece escurecido enquanto a condição não se cumpre; ao tentar jogá-lo, o aviso diz o que falta.',
          '🌡️ Febre (2): só se o adversário tiver um vírus ou bactéria. Durante 5s, os vírus e bactérias dele fazem +25% de dano.',
          '😮‍💨 Tosse (1): só se o adversário tiver um vírus ou bactéria. Tira 2 de vida por cada vírus ou bactéria que ele tenha.',
        ],
      },
      {
        title: '🤖 IA',
        items: ['Corrigido: a IA não contava as tuas doenças ao avaliar a Pneumonia, a Sépsis e a Diabetes — agora joga-as nos momentos certos.'],
      },
    ],
  },
  {
    version: '0.7',
    date: '29/09/2026',
    title: 'Estados',
    sections: [
      {
        title: '🩹 Categoria nova: Estado',
        items: [
          'Os Estados limitam o que o adversário pode jogar. Curam-se com o novo Repouso.',
          change('Alergia', 'Física', 'Estado'),
          change('AVC', 'Física', 'Estado'),
          change('Fratura', 'Física · só cartas até custo 4 durante 10s', 'Estado · só cartas até custo 4 (o custo impresso na carta) e sem Exercício durante 10s'),
          change('Exercício', 'cura Físicas (incluindo Fratura, AVC e Alergia)', 'cura só as Físicas: Sedentarismo, Asma, Obesidade, Hipertensão, Diabetes'),
        ],
      },
      {
        title: '🃏 Cartas novas',
        items: [
          '😪 Fadiga (Estado, 4): durante 8s todas as cartas do adversário custam +1.',
          '🛌 Repouso (Tratamento, 3): cura todos os Estados e recuperas 4 de vida.',
          '🖐️ Lepra (Bactéria, 3): 5 de dano em 10s e, durante esse tempo, o adversário não recebe curas.',
          '🔴 Sarampo (Vírus, 3): 12 de dano em 8s, com 40% de contágio.',
          '🧪 Antiviral (Tratamento, 3): durante 12s os vírus fazem-te metade do dano (anula a SIDA enquanto dura).',
          '🤧 Espirro (Vírus, 3): passa ao adversário uma cópia da tua doença mais forte (vírus ou bactéria, não permanente), com a duração completa. Tu continuas com ela.',
        ],
      },
      {
        title: '⚖️ Equilíbrio',
        items: [
          change('Quarentena', 'bloqueia todas as doenças durante 5s', 'bloqueia só vírus e bactérias durante 5s'),
          change('Tuberculose', '18 de dano em 16s', '16 de dano em 16s'),
          change('SIDA', 'fixa o dano de vírus e bactérias em ×2', 'multiplica-o por ×2 (o Antiviral pode compensar); continua a não acumular'),
        ],
      },
      {
        title: '✨ Outros',
        items: [
          'Página de Patch notes (esta!).',
          change('Emoji da Gripe', '🤧', '🥶 (o 🤧 é agora do Espirro)'),
          'Corrigido: multiplicadores de dano (como o do Antiviral) agora funcionam também com o dano ao longo do tempo.',
        ],
      },
    ],
  },
  {
    version: '0.6',
    date: '29/09/2026',
    title: 'Contas e enciclopédia',
    sections: [
      {
        title: '👤 Contas Google',
        items: [
          change('Entrar no jogo', 'sem conta (perfil guardado só no browser)', 'com a conta Google, num ecrã de entrada novo'),
          'O ranking, o histórico e os baralhos ficam na conta e aparecem em qualquer dispositivo.',
          'Na primeira vez, o perfil que já tinhas no browser fica ligado à conta (não perdes nada).',
          'Guardamos só o primeiro nome e o identificador da conta — nunca o email. Ver a Política de Privacidade.',
        ],
      },
      {
        title: '📖 Páginas das cartas',
        items: [
          'Cada carta tem a sua página: o que faz, o que a cura, o que a bloqueia, sinergias, estatísticas, o que é na vida real e um pouco de história.',
          'Lista de todas as cartas em /cartas, com links que se podem partilhar.',
        ],
      },
      { title: '✨ Outros', items: ['Logótipo novo do jogo.'] },
    ],
  },
  {
    version: '0.5',
    date: '29/09/2026',
    title: 'Versão base',
    sections: [
      {
        title: '🃏 Cartas novas',
        items: ['🚧 Quarentena (Tratamento, 3): durante 5s nenhum jogador pode jogar doenças.'],
      },
      {
        title: '⚖️ Equilíbrio',
        items: [
          change('Regeneração mínima de energia', 'sem limite (várias cartas juntas deixavam-na a ~15%)', 'nunca desce abaixo de 50% da normal'),
          change('Energia máxima mínima', '1', '6'),
          change('Sépsis', '+6 por cada doença ativa', '+6 por cada vírus ou bactéria ativa'),
          change('Alergia', 'custo 1', 'custo 2'),
          change('Ansiedade', '−4 de energia em 10s', '−3 de energia em 10s'),
          change('Tuberculose', '22 de dano em 16s', '18 de dano em 16s'),
          change('Covid', '30 de dano em 12s', '26 de dano em 12s'),
          change('Herpes', '1 de dano a cada 2,5s', '1 de dano a cada 3s'),
        ],
      },
    ],
  },
  {
    version: '0.4',
    date: '29/09/2026',
    title: 'IA, replays e ritmo de jogo',
    sections: [
      {
        title: '🎮 Novidades',
        items: [
          '🤖 Treinar contra a IA, em três dificuldades (Fácil, Normal, Difícil). Não conta para o ranking.',
          '📜 Histórico das últimas 30 partidas, com replay de cada uma (pausa, velocidade, saltar e ver do lado do adversário, com a mão dele à vista).',
          '🏳️ Botão para desistir.',
          '⏱️ Relógio grande com a fase de energia e a contagem até acelerar.',
          change('Energia', '+1 a cada 1,5s durante todo o jogo', '+1 a cada 2s no início, 1,5s a partir de 1:00, 1s a partir de 3:00 e 0,5s a partir de 4:00 (morte súbita)'),
        ],
      },
      {
        title: '⚖️ Equilíbrio',
        items: [
          change('Covid', '25 de dano em 12s', '30 de dano em 12s, com 25% de contágio (pode infetar quem a joga)'),
          change('Vacina', 'custo 2 · imune a vírus durante 10s', 'custo 3 · imune durante 7s'),
          change('Máscara', 'custo 1', 'custo 2'),
          change('Psicólogo', 'imune a mentais durante 15s', 'imune durante 8s'),
          change('Soro', 'custo 3', 'custo 4'),
          change('Café', '+50% de regeneração durante 10s', '+3 de energia em 6s'),
          change('Exercício', 'cura Físicas e dá imunidade a Físicas durante 8s', 'só cura as Físicas'),
          change('SIDA', 'custo 5', 'custo 10'),
          'Bipolaridade removida.',
        ],
      },
    ],
  },
  {
    version: '0.3',
    date: '28/09/2026',
    title: 'Baralhos e cartas mentais',
    sections: [
      {
        title: '🎮 Novidades',
        items: [
          change('Baralhos', '1 por jogador', 'até 10, com nome, escolha do ativo e apagar'),
          'Construtor de baralhos com filtros por tipo, efeito e custo, e pesquisa por nome.',
          change('Nome do recurso', 'mana', 'energia'),
        ],
      },
      {
        title: '🃏 Cartas novas',
        items: ['Amnésia, Paranoia, Burnout, Fratura, AVC e Psicólogo.'],
      },
    ],
  },
  {
    version: '0.2',
    date: '28/09/2026',
    title: 'Primeiro grande equilíbrio',
    sections: [
      {
        title: '📜 Regras',
        items: [
          change('Acumular doenças', 'a mesma carta jogada várias vezes somava', 'não acumula: jogar outra vez substitui a anterior'),
          change('Ébola e SIDA', 'curáveis com o Hospital', 'permanentes: nenhum tratamento os cura'),
        ],
      },
      {
        title: '⚖️ Mais dano',
        items: [
          change('Constipação', '2 de dano em 4s', '4 de dano em 4s'),
          change('Gripe', '5 de dano em 5s', '9 de dano em 6s'),
          change('Covid', 'custo 6 · 20 de dano em 15s', 'custo 5 · 25 de dano em 12s'),
          change('Ébola', 'custo 9 · 2/s até 100, 10% por segundo de passar', 'custo 8 · 3/s até 100, 10% por segundo de passar'),
          change('Salmonela', '3 de dano', '7 de dano'),
          change('Herpes', '1 de dano a cada 3s', '1 de dano a cada 2,5s'),
          change('Tuberculose', 'custo 6 · 16 de dano em 20s', 'custo 5 · 22 de dano em 16s'),
          change('Pneumonia', 'custo 5 · 6 de dano, +4 por vírus', 'custo 4 · 8 de dano, +5 por vírus'),
          change('Sépsis', 'custo 7 · 5 de dano, +5 por doença', 'custo 6 · 8 de dano, +6 por doença'),
        ],
      },
      {
        title: '⚖️ Curas mais fracas',
        items: [
          change('Vacina', 'custo 3 · cura os vírus e imune 12s', 'custo 2 · só imunidade, 10s'),
          change('Vitaminas', '12 de vida em 10s', '6 de vida em 10s'),
          change('Exercício', 'cura Físicas e +5 de vida', 'cura Físicas e imunidade a Físicas durante 8s'),
          change('Hospital', 'custo 8 · cura tudo e +20 de vida', 'custo 6 · cura vírus e bactérias e +8 de vida'),
        ],
      },
      {
        title: '⚖️ Outros',
        items: [
          change('Sedentarismo', 'custo 2 · −15% de regeneração', 'custo 3 · −20% de regeneração'),
          change('Ansiedade', '−3 de energia em 12s', '−4 de energia em 10s'),
          change('Enxaqueca', 'custo 3 · −2 de energia', 'custo 2 · −3 de energia'),
        ],
      },
      { title: '🃏 Cartas novas', items: ['SIDA, Alergia, Alzheimer, Máscara e Soro.'] },
    ],
  },
  {
    version: '0.1',
    date: '28/09/2026',
    title: 'Lançamento',
    sections: [
      {
        title: '🎮 O jogo',
        items: [
          'Jogo de cartas 1 contra 1 em tempo real, com o tema doenças.',
          'Procurar adversário (ranked) ou criar uma sala com código para jogar com um amigo.',
          'Construtor de baralhos, ranking, estatísticas, reconexão automática, sons e ver as cartas em grande.',
        ],
      },
    ],
  },
];

export const LATEST_VERSION = PATCH_NOTES[0].version;
const SEEN_KEY = 'sicknezz:seenVersion';

/** Ainda não viu as notas da versão mais recente? */
export function hasUnseenNotes(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== LATEST_VERSION;
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_VERSION);
  } catch {
    /* ignorar */
  }
}

function itemHtml(it: NoteItem): string {
  if (typeof it === 'string') return `<li>${escapeHtml(it)}</li>`;
  return `<li class="change"><b>${escapeHtml(it.name)}:</b> <span class="before">${escapeHtml(it.before)}</span> <span class="arrow">→</span> <span class="after">${escapeHtml(it.after)}</span></li>`;
}

export class PatchNotesScreen {
  private root = document.createElement('div');

  constructor(container: HTMLElement, navigate: (path: string) => void) {
    markSeen();
    this.root.className = 'cards-screen notes-screen';
    this.root.innerHTML = `
      <header class="builder-head">
        <a class="btn" href="/" data-nav>← Voltar</a>
        <div class="builder-title"><h2>📰 Patch notes</h2><span class="builder-stats">Versão atual: ${LATEST_VERSION}</span></div>
        <span style="width:80px"></span>
      </header>
      ${PATCH_NOTES.map(
        (n, i) => `
        <article class="note${i === 0 ? ' latest' : ''}">
          <h3><span class="note-version">v${n.version}</span> ${escapeHtml(n.title)} <span class="muted note-date">${n.date}</span></h3>
          ${n.sections
            .map((s) => `<h4>${escapeHtml(s.title)}</h4><ul>${s.items.map(itemHtml).join('')}</ul>`)
            .join('')}
        </article>`,
      ).join('')}`;
    this.root.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-nav]');
      if (!a) return;
      e.preventDefault();
      navigate(a.getAttribute('href')!);
    });
    container.append(this.root);
  }

  destroy() {
    this.root.remove();
  }
}
