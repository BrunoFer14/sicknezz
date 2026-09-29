// Patch notes: o que mudou em cada versão (a mais recente primeiro). Para uma versão nova, junta uma entrada no topo.
import { escapeHtml } from './card';

interface PatchNote {
  version: string;
  date: string;
  title: string;
  sections: { title: string; items: string[] }[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.7',
    date: '29/09/2026',
    title: 'Estados',
    sections: [
      {
        title: '🩹 Categoria nova: Estado',
        items: [
          'Os Estados limitam o que o adversário pode jogar. Curam-se com o novo Repouso.',
          'Alergia, Fratura e AVC passam de Física para Estado.',
          'Fratura: continua a limitar a cartas até custo 4 durante 10s e agora também impede o Exercício.',
          'A Fratura passa a olhar para o custo impresso na carta (sem os aumentos da Alergia ou da Fadiga).',
          'O Exercício passa a curar só as doenças Físicas (Sedentarismo, Asma, Obesidade, Hipertensão, Diabetes).',
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
          'Quarentena: passa a bloquear só vírus e bactérias (as Físicas, Estados e Mentais podem ser jogados).',
          'Tuberculose: dano 18 → 16.',
          'SIDA: passa a multiplicar o dano de vírus e bactérias por 2 (em vez de o fixar em 2), para o Antiviral a poder compensar. Continua a não acumular.',
        ],
      },
      {
        title: '✨ Outros',
        items: [
          'Página de Patch notes (esta!).',
          'A Gripe passa a usar o emoji 🥶 (o 🤧 é agora do Espirro).',
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
          'É preciso iniciar sessão com o Google para jogar. O jogo abre num ecrã de entrada novo.',
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
          'Regra nova: a regeneração de energia nunca desce abaixo de 50% da normal e a energia máxima nunca desce abaixo de 6 — acabaram os bloqueios de energia com várias cartas.',
          'Sépsis: conta só vírus e bactérias ativos.',
          'Alergia: custo 1 → 2. Ansiedade: tira 3 de energia (era 4).',
          'Tuberculose: dano 22 → 18. Covid: dano 30 → 26. Herpes: 1 de dano a cada 3s (era 2,5s).',
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
          'A energia acelera ao longo do jogo: 1 a cada 2s no início, 1,5s a partir de 1:00, 1s a partir de 3:00 e 0,5s a partir de 4:00 (morte súbita).',
          '🦠 Contágio: a Covid tem 25% de hipótese de também infetar quem a joga.',
        ],
      },
      {
        title: '⚖️ Equilíbrio',
        items: [
          'Vacina: custo 3, imunidade de 7s. Máscara: custo 2. Psicólogo: imunidade de 8s. Soro: custo 4.',
          'Café: passa a dar 3 de energia em 6s. Exercício: custo 3, só cura. SIDA: custo 10.',
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
          'Até 10 baralhos por jogador, com nome, escolha do ativo e apagar.',
          'Construtor de baralhos com filtros por tipo, efeito e custo, e pesquisa por nome.',
          'A "mana" passa a chamar-se energia.',
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
        title: '⚖️ Equilíbrio',
        items: [
          'Mais dano e curas mais fracas — as partidas já não ficam infinitas.',
          'A Vacina passa a dar só imunidade (não cura).',
          'Ébola e SIDA passam a ser permanentes: nenhum tratamento os cura.',
          'Regra nova: as doenças não acumulam — jogar a mesma carta outra vez substitui a anterior.',
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
            .map((s) => `<h4>${escapeHtml(s.title)}</h4><ul>${s.items.map((it) => `<li>${escapeHtml(it)}</li>`).join('')}</ul>`)
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
