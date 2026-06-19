import { Link } from "@tanstack/react-router";

/** Logo completa (escudo + slogan) — só limita largura, nunca corta. */
const WIDTH = {
  xs: "w-[6.5rem] sm:w-32",
  sm: "w-32",
  md: "w-40",
  lg: "w-56",
  xl: "w-72",
} as const;

type LogoProps = {
  size?: keyof typeof WIDTH;
  to?: string;
  className?: string;
};

export function Logo({ size = "md", to, className = "" }: LogoProps) {
  const img = (
    <img
      src="/logo-full.png"
      alt="Palpite Gol — O bolão ao vivo do seu jeito"
      className={`${WIDTH[size]} h-auto object-contain logo-img`}
      draggable={false}
    />
  );

  const wrapperClass = `inline-block ${className}`;

  if (to) {
    return (
      <Link
        to={to}
        className={`${wrapperClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg`}
        aria-label="Palpite Gol — início"
      >
        {img}
      </Link>
    );
  }

  return <div className={wrapperClass}>{img}</div>;
}
