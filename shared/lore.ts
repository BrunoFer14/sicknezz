// Texto das páginas das cartas: o que é a doença (ou tratamento) na vida real e um pouco de história.
// Informação geral, não substitui aconselhamento médico. Cartas novas sem texto mostram "em breve".
import type { CardId } from './cards';

export interface CardLore {
  /** O que é, na vida real. */
  what: string;
  /** Um pouco de história. */
  history: string;
}

export const LORE: Partial<Record<CardId, CardLore>> = {
  // ---------- Vírus ----------
  constipacao: {
    what: 'Infeção ligeira do nariz e da garganta, causada por mais de 200 vírus diferentes — sobretudo rinovírus. Dá espirros, nariz entupido e dor de garganta, e passa sozinha em cerca de uma semana.',
    history: 'Os rinovírus, os principais culpados, foram identificados nos anos 1950. Ainda hoje não há vacina: com tantos vírus diferentes, é quase impossível proteger contra todos.',
  },
  gripe: {
    what: 'Infeção respiratória causada pelos vírus influenza. É mais forte do que uma constipação: febre alta, dores no corpo e cansaço. O vírus muda todos os anos, por isso a vacina também é atualizada anualmente.',
    history: 'A gripe de 1918–1920 (a "gripe espanhola") foi uma das pandemias mais mortíferas da história, com dezenas de milhões de mortos. O vírus da gripe humana só foi isolado em 1933.',
  },
  herpes: {
    what: 'Infeção pelo vírus herpes simplex, que causa pequenas bolhas nos lábios ou noutras zonas. Depois da primeira infeção, o vírus fica "adormecido" nos nervos para toda a vida e pode voltar a acordar.',
    history: 'O nome vem do grego "herpein", que quer dizer rastejar, pela forma como as feridas se espalham. Já era descrito pelos médicos da Grécia Antiga.',
  },
  covid: {
    what: 'Doença causada pelo coronavírus SARS-CoV-2. Transmite-se pelo ar, em gotículas e aerossóis, e pode ir de sintomas ligeiros a pneumonia grave. É muito contagiosa — por isso, no jogo, pode apanhar quem a joga.',
    history: 'Foi identificada no fim de 2019 e a Organização Mundial da Saúde declarou-a pandemia a 11 de março de 2020. As primeiras vacinas ficaram prontas em menos de um ano, um recorde na história da medicina.',
  },
  ebola: {
    what: 'Febre hemorrágica grave causada pelo vírus Ébola. Transmite-se pelo contacto com sangue e outros fluidos de pessoas ou animais infetados e tem uma mortalidade muito elevada.',
    history: 'Foi identificado em 1976, perto do rio Ébola, na atual República Democrática do Congo — o rio deu-lhe o nome. O maior surto aconteceu na África Ocidental entre 2014 e 2016, com mais de 11 000 mortos.',
  },
  sarampo: {
    what: 'Infeção viral muito contagiosa, com febre alta e manchas vermelhas pelo corpo. Transmite-se pelo ar: cerca de 9 em cada 10 pessoas não vacinadas que convivem com um doente acabam por apanhá-lo — daí o contágio alto no jogo.',
    history: 'A vacina contra o sarampo existe desde 1963 e hoje faz parte da vacina tríplice (sarampo, papeira e rubéola). Quando a vacinação desce, o sarampo volta rapidamente, como aconteceu em vários países europeus na última década.',
  },
  espirro: {
    what: 'Um espirro lança milhares de gotículas a vários metros de distância — é uma das principais formas de se passar uma gripe, uma constipação ou uma tuberculose a quem está perto. Quem espirra continua doente; só passou a doença a mais alguém.',
    history: 'Em 1942, fotografias de alta velocidade feitas nos Estados Unidos mostraram pela primeira vez a nuvem de gotículas de um espirro — e ajudaram a popularizar o conselho de espirrar para o cotovelo ou para um lenço.',
  },
  sida: {
    what: 'A SIDA é a fase avançada da infeção pelo VIH, um vírus que ataca as defesas do corpo. Sem defesas, outras infeções tornam-se muito mais perigosas — é por isso que, no jogo, vírus e bactérias fazem o dobro do dano.',
    history: 'Os primeiros casos foram descritos em 1981 e o VIH foi descoberto em 1983 no Instituto Pasteur, em Paris (Prémio Nobel em 2008). Desde meados dos anos 1990, os antirretrovirais transformaram-na numa doença crónica controlável. O laço vermelho 🎗️ é o símbolo da luta contra a SIDA.',
  },

  // ---------- Bactérias ----------
  salmonela: {
    what: 'Bactéria que causa intoxicações alimentares, muitas vezes por ovos ou carne de aves mal cozinhados. Provoca diarreia, febre e dores de barriga durante alguns dias.',
    history: 'O nome homenageia o veterinário norte-americano Daniel Salmon, embora quem a descobriu, em 1885, tenha sido o seu assistente Theobald Smith.',
  },
  pneumonia: {
    what: 'Infeção dos pulmões que enche os alvéolos de líquido e dificulta a respiração. Pode ser causada por bactérias, vírus ou fungos, e aparece muitas vezes como complicação de uma gripe — daí a sinergia com vírus no jogo.',
    history: 'Já era descrita por Hipócrates na Grécia Antiga. A descoberta da penicilina por Alexander Fleming, em 1928, mudou completamente o tratamento das pneumonias bacterianas.',
  },
  tuberculose: {
    what: 'Infeção causada pela bactéria Mycobacterium tuberculosis, que ataca sobretudo os pulmões e se transmite pelo ar. Causa tosse prolongada, febre e cansaço, e o tratamento dura vários meses.',
    history: 'Robert Koch descobriu a bactéria a 24 de março de 1882 — por isso esse é o Dia Mundial da Tuberculose. Antigamente chamava-se "tísica". A vacina BCG é de 1921, e a tuberculose continua a ser uma das infeções mais mortais do mundo.',
  },
  sepsis: {
    what: 'Emergência médica em que a resposta do corpo a uma infeção fica descontrolada e começa a danificar os próprios órgãos. Quanto mais infeções houver, pior — como no jogo.',
    history: 'A palavra vem do grego e quer dizer "putrefação". Em 1847, o médico Ignaz Semmelweis mostrou que lavar as mãos reduzia drasticamente as infeções mortais nas maternidades.',
  },

  lepra: {
    what: 'Infeção crónica causada pela bactéria Mycobacterium leprae, hoje chamada hanseníase. Ataca a pele e os nervos: sem sensibilidade, as feridas passam despercebidas e não saram bem — por isso, no jogo, bloqueia as curas. Tem cura com antibióticos.',
    history: 'Foi uma das doenças mais estigmatizadas da história, com os doentes isolados em leprosarias. Em 1873, o médico norueguês Gerhard Armauer Hansen identificou a bactéria — uma das primeiras associadas a uma doença humana. Desde os anos 1980, a OMS distribui gratuitamente o tratamento com vários antibióticos.',
  },

  // ---------- Físicas ----------
  sedentarismo: {
    what: 'Falta de atividade física no dia a dia. Aumenta o risco de doenças do coração, diabetes e obesidade. A Organização Mundial da Saúde recomenda pelo menos 150 minutos de atividade moderada por semana para adultos.',
    history: 'Em 1953, um estudo com trabalhadores dos autocarros de Londres mostrou que os cobradores, que passavam o dia a subir escadas, tinham menos enfartes do que os motoristas, sempre sentados.',
  },
  asma: {
    what: 'Doença crónica em que as vias respiratórias inflamam e estreitam, causando falta de ar, pieira e tosse. As crises podem ser provocadas por alergias, exercício ou frio. No jogo, "tira o fôlego" à tua energia.',
    history: 'O nome vem do grego "asthma", que quer dizer arquejar. Os inaladores de bolso, que tornaram o tratamento muito mais fácil, surgiram em 1956.',
  },
  obesidade: {
    what: 'Acumulação excessiva de gordura no corpo, que aumenta o risco de diabetes, doenças cardíacas e alguns cancros. É medida pelo índice de massa corporal (IMC): 30 ou mais é considerado obesidade.',
    history: 'O IMC foi criado no século XIX pelo matemático belga Adolphe Quetelet. Segundo a OMS, a obesidade em adultos mais do que duplicou no mundo desde 1990.',
  },
  hipertensao: {
    what: 'Tensão arterial elevada de forma persistente. Chamam-lhe o "assassino silencioso" porque raramente dá sintomas, mas aumenta muito o risco de AVC e enfarte.',
    history: 'O aparelho para medir a tensão com braçadeira foi inventado por Scipione Riva-Rocci em 1896. Em 1905, Nikolai Korotkov descobriu os sons que ainda hoje se ouvem com o estetoscópio ao medir a tensão.',
  },
  diabetes: {
    what: 'Doença em que o açúcar (glicose) no sangue fica demasiado alto, porque o corpo não produz insulina suficiente (tipo 1) ou não a usa bem (tipo 2). Com o tempo, danifica o coração, os rins, os olhos e os nervos.',
    history: 'A insulina foi descoberta em 1921 por Frederick Banting e Charles Best, em Toronto, e salvou a vida ao primeiro doente logo no ano seguinte. "Mellitus", o nome completo, quer dizer "doce como mel", por causa do açúcar na urina.',
  },
  enfarte: {
    what: 'Um enfarte do miocárdio acontece quando uma artéria do coração fica bloqueada e parte do músculo deixa de receber sangue. É súbito e muito perigoso — sobretudo em quem já está fragilizado, como no jogo. Dor forte no peito que não passa? Liga logo 112.',
    history: 'Em 1912, o médico norte-americano James Herrick foi dos primeiros a descrever que um enfarte podia ser causado por um coágulo numa artéria do coração — e que era possível sobreviver a ele.',
  },
  fratura: {
    what: 'Quebra de um osso, por queda ou pancada. Normalmente é preciso imobilizar a zona e o osso demora algumas semanas a consolidar — no jogo, fica sem conseguir "carregar" cartas pesadas.',
    history: 'Os raios X, descobertos por Wilhelm Röntgen em 1895, permitiram pela primeira vez ver uma fratura sem abrir o corpo. Röntgen recebeu o primeiro Prémio Nobel da Física, em 1901.',
  },
  avc: {
    what: 'Acidente vascular cerebral: uma parte do cérebro deixa de receber sangue, por um coágulo ou por uma hemorragia. Os sinais são súbitos — boca ao lado, falta de força num braço, dificuldade em falar. Perante estes sinais, liga logo 112.',
    history: 'Na Antiguidade chamava-se "apoplexia", que em grego quer dizer "derrubado por um golpe". Em Portugal, o AVC é uma das principais causas de morte e de incapacidade.',
  },
  alergia: {
    what: 'Reação exagerada do sistema imunitário a coisas normalmente inofensivas, como pólen, ácaros ou certos alimentos. Pode ir de espirros e comichão a reações graves.',
    history: 'A palavra "alergia" foi criada em 1906 pelo pediatra austríaco Clemens von Pirquet. A "febre dos fenos" (alergia ao pólen) tinha sido descrita em 1819 pelo médico inglês John Bostock, que sofria dela.',
  },

  fadiga: {
    what: 'Cansaço intenso e persistente, que não passa com uma noite de sono. Pode vir de falta de descanso, de stress ou de uma doença, e faz com que qualquer tarefa pareça custar mais — no jogo, todas as cartas custam mais energia.',
    history: 'A "síndrome de fadiga crónica" só foi reconhecida como doença nos anos 1980. Durante muito tempo, quem sofria dela era acusado de preguiça, o que hoje se sabe estar errado.',
  },

  // ---------- Mentais ----------
  ansiedade: {
    what: 'Preocupação e medo excessivos e persistentes, muitas vezes acompanhados de coração acelerado e tensão. As perturbações de ansiedade estão entre os problemas de saúde mental mais comuns — e têm tratamento.',
    history: 'Sigmund Freud descreveu a "neurose de ansiedade" em 1895. Hoje sabe-se que a psicoterapia, em especial a terapia cognitivo-comportamental, é muito eficaz.',
  },
  enxaqueca: {
    what: 'Dor de cabeça forte e latejante, muitas vezes só de um lado, com náuseas e sensibilidade à luz e ao barulho. Algumas pessoas veem luzes ou manchas antes da crise (a "aura").',
    history: 'A palavra "enxaqueca" vem do árabe e quer dizer "metade da cabeça". Já no século II, o médico grego Areteu da Capadócia a descrevia.',
  },
  insonia: {
    what: 'Dificuldade em adormecer ou em manter o sono, que deixa a pessoa cansada, irritável e com dificuldade de concentração durante o dia. Um adulto precisa, em geral, de pelo menos 7 horas de sono.',
    history: 'Em 1964, o estudante norte-americano Randy Gardner ficou 11 dias seguidos sem dormir, numa experiência que se tornou famosa. Ao fim de poucos dias já tinha problemas de memória e de concentração.',
  },
  depressao: {
    what: 'Perturbação do humor com tristeza persistente, perda de interesse, cansaço e dificuldade em fazer as coisas do dia a dia. A OMS considera-a uma das principais causas de incapacidade no mundo. Tem tratamento: se precisares, fala com alguém.',
    history: 'Na Grécia Antiga chamava-se "melancolia", que quer dizer "bílis negra", porque Hipócrates achava que era causada por um excesso desse humor no corpo.',
  },
  burnout: {
    what: 'Esgotamento causado por stress crónico no trabalho: exaustão, distanciamento e sensação de não conseguir dar conta do recado. No jogo, queima a energia que estava guardada.',
    history: 'O termo foi popularizado pelo psicólogo Herbert Freudenberger em 1974. Em 2019, a OMS incluiu-o na sua classificação internacional como um fenómeno ligado ao trabalho.',
  },
  paranoia: {
    what: 'Desconfiança intensa e sem fundamento de que os outros nos querem prejudicar. Pode fazer parte de várias perturbações mentais. No jogo, deixa de conseguir ver o que se passa consigo.',
    history: 'A palavra vem do grego "para" (fora) e "nous" (mente) — literalmente, "fora da mente".',
  },
  amnesia: {
    what: 'Perda de memória, que pode ser causada por lesões na cabeça, doenças ou traumas. Pode afetar as memórias antigas ou a capacidade de criar memórias novas.',
    history: 'O caso de Henry Molaison, operado ao cérebro em 1953, ficou famoso: depois da cirurgia, deixou de conseguir criar memórias novas. O seu caso mostrou o papel do hipocampo na memória.',
  },
  alzheimer: {
    what: 'Doença neurodegenerativa e a causa mais comum de demência. Começa com falhas de memória e vai afetando o pensamento, a orientação e a autonomia. No jogo, baralha tudo o que tens na mão.',
    history: 'Foi descrita em 1906 pelo médico alemão Alois Alzheimer, a partir do caso de uma doente chamada Auguste Deter, que perdia progressivamente a memória.',
  },

  // ---------- Sintomas ----------
  febre: {
    what: 'Subida da temperatura do corpo, normalmente acima dos 38 °C. É um sinal de que o organismo está a combater uma infeção — por isso, no jogo, só aparece quando já há um vírus ou bactéria, e torna-os mais fortes.',
    history: 'O termómetro clínico moderno, pequeno e rápido, foi inventado em 1867 pelo médico inglês Thomas Allbutt. Antes disso, medir a febre podia demorar 20 minutos.',
  },
  tosse: {
    what: 'Reflexo que limpa as vias respiratórias de muco, poeiras ou micróbios. É um dos sintomas mais comuns de infeções respiratórias — quanto mais infeções, mais tosse.',
    history: 'A tosse convulsa, causada por uma bactéria, era uma das principais causas de morte infantil antes da vacina, introduzida nos anos 1940.',
  },
  vomitos: {
    what: 'Forma de o corpo expulsar à força o que tem no estômago. Acontece muitas vezes com infeções como a gastroenterite ou intoxicações alimentares, e o maior perigo é a desidratação.',
    history: 'O soro de reidratação oral, uma simples mistura de água, sal e açúcar, foi testado em grande escala nos anos 1970 e já salvou milhões de vidas de crianças com vómitos e diarreia.',
  },
  dorCabeca: {
    what: 'Uma das queixas mais comuns, muitas vezes por cansaço, desidratação ou stress. É também um sintoma habitual de infeções como a gripe, quando o corpo está a combater um vírus. No jogo, deixa o adversário mais lento a reagir.',
    history: 'A aspirina, um dos remédios mais usados contra a dor de cabeça, foi sintetizada pela Bayer em 1897, a partir de uma substância que já se tirava da casca do salgueiro.',
  },

  // ---------- Tratamentos ----------
  medicacao: {
    what: 'Os medicamentos contra infeções dividem-se em antibióticos, que matam bactérias, e antivirais, que travam a multiplicação dos vírus. Nenhum funciona contra tudo — mas no jogo junta-se tudo numa carta.',
    history: 'Em 1928, Alexander Fleming descobriu a penicilina, o primeiro antibiótico. Os antivirais chegaram mais tarde: o aciclovir, contra o herpes, nos anos 1970, e as combinações contra o VIH em 1996.',
  },
  fisioterapia: {
    what: 'Tratamento com exercícios, movimento e técnicas manuais para recuperar de lesões, fraturas ou de um AVC, e para melhorar problemas como a falta de atividade física ou a obesidade.',
    history: 'Em 1813, o sueco Pehr Henrik Ling fundou em Estocolmo um instituto de ginástica médica, considerado um dos pontos de partida da fisioterapia moderna.',
  },
  bebida: {
    what: 'Bebidas com muita cafeína e açúcar, que dão um pico rápido de energia. Uma de vez em quando não faz mal a um adulto, mas beber muitas pode causar palpitações, ansiedade e insónias — por isso, no jogo, cada bebida a mais custa-te vida.',
    history: 'A Red Bull foi lançada na Áustria em 1987, inspirada numa bebida tailandesa chamada Krating Daeng. A Autoridade Europeia para a Segurança dos Alimentos considera que até 400 mg de cafeína por dia são seguros para um adulto — cerca de cinco latas.',
  },
  cafe: {
    what: 'O café contém cafeína, um estimulante que bloqueia no cérebro os sinais de cansaço (a adenosina). Dá energia durante umas horas — no jogo, literalmente.',
    history: 'Conta a lenda que um pastor etíope chamado Kaldi descobriu o café ao ver as suas cabras muito agitadas depois de comerem os frutos de um arbusto.',
  },
  vitaminas: {
    what: 'Nutrientes de que o corpo precisa em pequenas quantidades para funcionar bem e que vêm sobretudo da alimentação. A falta de algumas causa doenças.',
    history: 'Em 1747, o médico escocês James Lind mostrou que os citrinos curavam o escorbuto nos marinheiros — uma das primeiras experiências clínicas controladas. Mais tarde percebeu-se que a causa era a falta de vitamina C.',
  },
  vacina: {
    what: 'Ensina o sistema imunitário a reconhecer um vírus ou bactéria antes de o encontrar a sério. Há vacinas contra vírus (gripe, sarampo) e contra bactérias (tétano, tosse convulsa). Não cura uma infeção que já existe — protege contra novas, como no jogo.',
    history: 'Em 1796, Edward Jenner usou a varíola das vacas para proteger contra a varíola humana. A palavra "vacina" vem do latim "vacca". Graças à vacinação, a varíola foi declarada erradicada em 1980.',
  },
  quarentena: {
    what: 'Isolamento de pessoas que podem ter sido expostas a uma doença contagiosa, para evitar que a espalhem. No jogo, durante uns segundos, ninguém consegue passar vírus nem bactérias a ninguém.',
    history: 'A palavra vem do italiano "quaranta giorni" (40 dias): durante a Peste Negra, no século XIV, os navios que chegavam a Veneza tinham de esperar esse tempo antes de desembarcar.',
  },
  terapia: {
    what: 'A psicoterapia trata problemas de saúde mental através da conversa com um profissional, ajudando a mudar formas de pensar e de agir que fazem mal.',
    history: 'A terapia cognitivo-comportamental, uma das mais usadas e estudadas, foi desenvolvida pelo psiquiatra Aaron Beck nos anos 1960.',
  },
  hospital: {
    what: 'Lugar onde se tratam as doenças mais graves, com médicos, enfermeiros e equipamentos que não existem em casa. No jogo, cura tudo o que não seja permanente.',
    history: 'Em Lisboa, a construção do Hospital Real de Todos-os-Santos começou em 1492. Foi um dos maiores hospitais da Europa da época, até ser destruído no terramoto de 1755.',
  },
};
