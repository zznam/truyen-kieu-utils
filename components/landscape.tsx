export function Landscape() {
  return (
    <svg
      className="landscape"
      viewBox="0 0 620 620"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="hill"
          x1="300"
          y1="240"
          x2="300"
          y2="620"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8b9a87" stopOpacity=".5" />
          <stop offset="1" stopColor="#7a8977" stopOpacity=".08" />
        </linearGradient>
        <linearGradient id="sky" x1="310" y1="0" x2="310" y2="620" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ece9d9" />
          <stop offset="1" stopColor="#f4f1e7" />
        </linearGradient>
      </defs>
      <rect width="620" height="620" fill="url(#sky)" />
      <circle cx="390" cy="176" r="65" fill="#c77c60" opacity=".65" />
      <path
        d="M0 405C60 404 109 297 159 308C209 319 204 357 250 338C299 319 330 228 381 257C432 286 460 359 504 342C548 325 576 298 620 311V620H0Z"
        fill="url(#hill)"
      />
      <path
        d="M0 471C57 473 70 410 116 416C162 422 205 468 249 431C293 394 321 375 369 401C417 427 437 485 495 443C553 401 569 423 620 420V620H0Z"
        fill="#8b9987"
        opacity=".28"
      />
      <path
        d="M0 539C58 500 99 536 155 527C211 518 258 492 315 514C372 536 427 563 483 543C539 523 571 514 620 527V620H0Z"
        fill="#5e7665"
        opacity=".25"
      />
      <path
        d="M0 581Q120 564 252 584T620 580M0 598Q135 585 280 601T620 595"
        stroke="#556e5b"
        opacity=".15"
      />
      <path
        d="M620 30C569 67 584 109 519 128C478 139 472 168 435 190M567 99C553 67 535 52 506 48M526 125C532 149 548 160 565 171M477 157C453 138 432 137 419 147"
        stroke="#5e5145"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[
        [554, 74],
        [529, 56],
        [508, 48],
        [530, 128],
        [552, 158],
        [567, 171],
        [488, 150],
        [459, 145],
        [437, 184],
        [418, 148],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle cy="-5" r="6" fill="#b56555" opacity=".7" />
          <circle cx="-5" cy="3" r="6" fill="#c48170" opacity=".8" />
          <circle cx="5" cy="3" r="6" fill="#d69c88" />
          <circle r="2" fill="#f1d3a2" />
        </g>
      ))}
      <path
        d="M91 194q9-9 18 0q9-9 18 0M137 168q6-6 12 0q6-6 12 0"
        stroke="#5e6657"
        strokeWidth="1.5"
        opacity=".55"
      />
    </svg>
  )
}
