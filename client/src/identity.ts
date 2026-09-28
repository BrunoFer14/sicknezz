// Identidade anónima do jogador, sem contas:
// - profileId/secret ficam no browser (localStorage) e identificam o jogador nas estatísticas e no ranking;
// - session é por separador (sessionStorage) e serve para voltar à partida depois de a ligação cair ou de recarregar.

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

export const identity = {
  profileId: stored(() => localStorage, 'sicknezz:profileId', () => randomHex(16)),
  secret: stored(() => localStorage, 'sicknezz:secret', () => randomHex(24)),
  session: stored(() => sessionStorage, 'sicknezz:session', () => randomHex(16)),
};
