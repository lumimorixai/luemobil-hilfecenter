/**
 * Das LüMobil-Zeichen — dasselbe wie im Kopf des Hilfe-Centers, damit intern
 * und öffentlich dieselbe Marke steht.
 *
 * Der Verlauf ist Teil des Zeichens; die Regel „keine Verläufe" des
 * Design-Systems gilt für Flächen, nicht für das Signet.
 *
 * Eigene Datei, weil es an zwei Stellen gebraucht wird: in der Seitenleiste
 * und im Kopf der fokussierten Ansicht. Die Verlaufs-Kennung ist je Aufruf
 * eindeutig, sonst greifen zwei gleichzeitig gerenderte Zeichen auf dieselbe
 * Definition zu.
 */
let zaehler = 0

export function LuemobilZeichen({ className = 'cx-nav-logo' }: { className?: string }) {
  const id = `cx_lm_grad_${++zaehler}`
  return (
    <svg className={className} viewBox="0 0 1024 1024" role="img" aria-label="LüMobil">
      <defs>
        <linearGradient
          id={id}
          x1="451.37"
          y1="293.12"
          x2="744.85"
          y2="642.87"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff8200" />
          <stop offset=".36" stopColor="#ff3d59" />
          <stop offset=".53" stopColor="#ff00aa" />
          <stop offset=".72" stopColor="#b945c1" />
          <stop offset=".81" stopColor="#8579d2" />
          <stop offset=".91" stopColor="#43bbe8" />
          <stop offset="1" stopColor="#00ffff" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#${id})`}
        points="803.87 223.15 231.68 509.24 517.77 509.24 517.77 795.33 803.87 223.15"
      />
    </svg>
  )
}
