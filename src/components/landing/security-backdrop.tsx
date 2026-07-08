const SIGNALS = [
  { text: "1 voto · IP", side: "left" as const, top: "18%" },
  { text: "gratuito", side: "right" as const, top: "22%" },
  { text: "anti-fraude", side: "left" as const, top: "62%" },
  { text: "voto único", side: "right" as const, top: "58%" },
  { text: "proteção ativa", side: "left" as const, top: "82%" },
  { text: "mais seguro · BR", side: "right" as const, top: "78%" },
];

export function SecurityBackdrop() {
  return (
    <div className="votti-security-backdrop" aria-hidden>
      {SIGNALS.map((signal, i) => (
        <span
          key={signal.text}
          className={`votti-security-backdrop__tag votti-security-backdrop__tag--${signal.side}`}
          style={{
            top: signal.top,
            animationDelay: `${i * 1.1}s`,
          }}
        >
          {signal.text}
        </span>
      ))}
    </div>
  );
}
