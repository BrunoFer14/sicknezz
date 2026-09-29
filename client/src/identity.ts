// Identidade do jogador:
// - profileId/secret ficam no browser (localStorage) e identificam o jogador nas estatísticas e no ranking.
//   Sem conta são gerados aqui; com login Google, o servidor dá um perfil/segredo para este dispositivo.
// - session é por separador (sessionStorage) e serve para voltar à partida depois de a ligação cair ou de recarregar.

const PROFILE_KEY = 'sicknezz:profileId';
const SECRET_KEY = 'sicknezz:secret';

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

function stored(storage: () => Storage, key: string, make: () => string): string {
  try {
    const s = storage();
    let v = s.getItem(key);
    if (!v) {
      v = make();
      s.setItem(key, v);
    }
    return v;
  } catch {
    return make();
  }
}

function save(profileId: string, secret: string) {
  identity.profileId = profileId;
  identity.secret = secret;
  try {
    localStorage.setItem(PROFILE_KEY, profileId);
    localStorage.setItem(SECRET_KEY, secret);
  } catch {
    /* ignorar */
  }
}

export const identity = {
  profileId: stored(() => localStorage, PROFILE_KEY, () => randomHex(16)),
  secret: stored(() => localStorage, SECRET_KEY, () => randomHex(24)),
  session: stored(() => sessionStorage, 'sicknezz:session', () => randomHex(16)),
};

/** Depois do login: este dispositivo passa a usar o perfil da conta. */
export function setIdentity(profileId: string, secret: string) {
  save(profileId, secret);
}

/** Depois de terminar a sessão: volta a um perfil anónimo novo. */
export function resetIdentity() {
  save(randomHex(16), randomHex(24));
}
