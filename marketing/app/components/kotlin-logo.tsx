export function KotlinLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className}>
      <defs>
        <linearGradient
          id="a"
          x1="500.003"
          x2="-.097"
          y1="579.106"
          y2="1079.206"
          gradientTransform="translate(15.534 -96.774) scale(.1939)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".003" stopColor="#e44857"></stop>
          <stop offset=".469" stopColor="#c711e1"></stop>
          <stop offset="1" stopColor="#7f52ff"></stop>
        </linearGradient>
      </defs>
      <path
        fill="url(#a)"
        d="M112.484 112.484H15.516V15.516h96.968L64 64Zm0 0"
      ></path>
    </svg>
  );
}
