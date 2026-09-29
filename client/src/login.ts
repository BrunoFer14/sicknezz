// Ecrã de entrada: é preciso iniciar sessão com a Google para jogar.
import { escapeHtml } from './card';
import { renderGoogleButton } from './google';

export class LoginScreen {
  private root = document.createElement('div');

  constructor(
    private container: HTMLElement,
    private onCredential: (credential: string) => void,
  ) {
    this.root.className = 'lobby login';
    this.showConnecting();
  }

  /** Antes de o servidor responder. */
  showConnecting() {
    this.render('<p class="muted login-wait">A ligar ao servidor<span class="dots"></span></p>');
  }

  /** Botão da Google (com uma mensagem de erro opcional). */
  show(clientId: string, error = '') {
    this.render(`
      <div class="google-btn"></div>
      <p class="muted">Entra com a tua conta Google para jogar. O teu ranking, histórico e baralhos ficam guardados na conta, em qualquer dispositivo.</p>
      <p class="muted small">Guardamos só o teu primeiro nome e o identificador da conta — nunca o teu email.</p>
      <p class="error">${escapeHtml(error)}</p>`);
    const el = this.root.querySelector<HTMLElement>('.google-btn')!;
    renderGoogleButton(el, clientId, (c) => {
      this.render('<p class="muted login-wait">A entrar<span class="dots"></span></p>');
      this.onCredential(c);
    }).then((ok) => {
      if (!ok && el.isConnected) this.error('Não foi possível carregar o botão da Google. Verifica a ligação ou desativa bloqueadores de anúncios para este site.');
    });
  }

  error(message: string) {
    const el = this.root.querySelector('.error');
    if (el) el.textContent = message;
  }

  hide() {
    this.root.remove();
  }

  private render(body: string) {
    this.root.innerHTML = `
      <img class="login-logo" src="/logo.svg" alt="" />
      <h1 class="logo">SICK<span>NEZZ</span></h1>
      <p class="tagline">Infeta o teu adversário antes que ele te infete a ti.</p>
      <div class="panel login-panel">${body}</div>
      <p class="lobby-footer"><a href="/cartas">📖 Ver as cartas</a> · <a href="/patch-notes">📰 Patch notes</a> · <a href="/privacidade.html">Política de Privacidade</a></p>`;
    if (!this.root.isConnected) this.container.append(this.root);
  }
}
