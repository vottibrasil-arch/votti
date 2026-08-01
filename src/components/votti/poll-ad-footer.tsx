/** Rodapé de monetização — só em páginas públicas de votação (via PollPublicShell). */

const PROPAGANDA_FRAME_SRC = "/propaganda/frame";

export function PollAdFooter() {
  return (
    <aside className="votti-poll-ad-footer animate-rise" aria-label="Propaganda e parceiros">
      <section className="votti-poll-ad-footer__block">
        <h2 className="votti-poll-ad-footer__title">Propaganda</h2>
        <div className="votti-poll-ad-footer__frame-wrap">
          <iframe
            title="Conteúdo patrocinado"
            src={PROPAGANDA_FRAME_SRC}
            className="votti-poll-ad-footer__frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <section className="votti-poll-ad-footer__block votti-poll-ad-footer__partners" aria-label="Nossos parceiros">
        <h2 className="votti-poll-ad-footer__title">Nossos parceiros</h2>
        <p className="votti-poll-ad-footer__partners-empty">Em breve</p>
      </section>
    </aside>
  );
}
