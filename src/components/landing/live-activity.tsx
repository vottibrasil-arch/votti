import { useEffect, useState } from "react";

const MESSAGES = [
  "+1 voto",
  "Atualizado agora",
  "Ranking alterado",
  "Novo participante",
  "Resultado atualizado",
  "IP verificado",
  "1 voto confirmado",
  "Fraude bloqueada",
  "Sistema seguro",
];

export function LiveActivityFeed() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    let id = 0;
    const interval = setInterval(() => {
      const text = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const newId = ++id;
      setItems((prev) => [{ id: newId, text }, ...prev].slice(0, 4));
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== newId));
      }, 3200);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-feed" aria-live="polite">
      {items.map((item) => (
        <span key={item.id} className="live-feed__pill">
          {item.text}
        </span>
      ))}
    </div>
  );
}

export function LiveVoteCounter() {
  const [count, setCount] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 3) + 1);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="live-global-counter">
      <span className="live-global-counter__dot" />
      <span className="tabular-nums font-display font-bold text-lg sm:text-xl">
        {count.toLocaleString("pt-BR")}
      </span>
      <span className="text-sm opacity-80"> pessoas votando agora</span>
    </p>
  );
}
