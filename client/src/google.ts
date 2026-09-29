// Biblioteca da Google para o botão "Iniciar sessão com Google" (carregada só quando é precisa).
type GoogleApi = any;
let script: Promise<GoogleApi | null> | null = null;

function loadGoogle(): Promise<GoogleApi | null> {
  script ??= new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve((window as unknown as { google?: GoogleApi }).google ?? null);
    s.onerror = () => resolve(null);
    document.head.append(s);
  });
  return script;
}

/** Desenha o botão oficial da Google em `el`. Devolve false se a biblioteca não carregar (ex.: sem internet ou bloqueada). */
export async function renderGoogleButton(el: HTMLElement, clientId: string, onCredential: (credential: string) => void): Promise<boolean> {
  const g = await loadGoogle();
  if (!g || !el.isConnected) return false;
  g.accounts.id.initialize({ client_id: clientId, callback: (r: { credential: string }) => onCredential(r.credential) });
  g.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill', locale: 'pt-PT', width: 280 });
  return true;
}
