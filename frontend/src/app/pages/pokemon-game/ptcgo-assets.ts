// SVG Assets and textures for the authentic Pokémon TCG Online (PTCGO) aesthetic

export const PTCGO_ASSETS = {
  // Wood grain background pattern
  woodTableBg: `radial-gradient(ellipse at 50% 50%, #4a2e18 0%, #2e1a0e 55%, #180b06 100%)`,

  // Subtle Pokeball & Energy watermark pattern for the playmat halves
  matWatermarkSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" opacity="0.045"><circle cx="40" cy="40" r="22" fill="none" stroke="%23ffffff" stroke-width="3"/><line x1="18" y1="40" x2="62" y2="40" stroke="%23ffffff" stroke-width="3"/><circle cx="40" cy="40" r="7" fill="%23ffffff"/><circle cx="40" cy="40" r="3" fill="%23000000"/></svg>`,

  // GX / TAG TEAM Marker (SVG data URI)
  gxMarkerSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="160" height="80">
    <defs>
      <linearGradient id="gxBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="%231e293b"/>
        <stop offset="100%" stop-color="%230f172a"/>
      </linearGradient>
      <linearGradient id="gxGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="%23fef08a"/>
        <stop offset="50%" stop-color="%23eab308"/>
        <stop offset="100%" stop-color="%23ca8a04"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
      </filter>
    </defs>
    <rect x="4" y="4" width="152" height="72" rx="10" fill="url(%23gxBg)" stroke="%2338bdf8" stroke-width="2" filter="url(%23shadow)"/>
    <rect x="8" y="8" width="144" height="64" rx="7" fill="none" stroke="%231e293b" stroke-width="1.5"/>
    <!-- GX Text -->
    <text x="80" y="45" font-family="'Arial Black', Impact, sans-serif" font-size="34" font-weight="900" font-style="italic" fill="url(%23gxGold)" text-anchor="middle" letter-spacing="1">GX</text>
    <!-- TAG TEAM Badge -->
    <rect x="42" y="52" width="76" height="15" rx="3" fill="%230284c7"/>
    <text x="80" y="63" font-family="Arial, sans-serif" font-size="9" font-weight="800" fill="%23ffffff" text-anchor="middle" letter-spacing="1">TAG TEAM</text>
  </svg>`,

  // Opponent Avatar (Kendall)
  opponentAvatarSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="%230284c7"/>
        <stop offset="100%" stop-color="%230f172a"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="16" fill="url(%23bgGrad)"/>
    <!-- Anime hair/face -->
    <circle cx="50" cy="46" r="24" fill="%23fed7aa"/>
    <!-- Hair back -->
    <path d="M 22 55 C 18 30 35 15 50 15 C 68 15 82 28 80 55 C 75 42 68 35 50 35 C 32 35 25 42 22 55 Z" fill="%230284c7"/>
    <!-- Bangs -->
    <path d="M 24 35 C 32 20 48 24 60 22 C 72 20 78 32 78 35 C 70 32 60 38 52 35 C 42 32 32 45 24 35 Z" fill="%230369a1"/>
    <!-- Eyes -->
    <ellipse cx="40" cy="45" rx="4.5" ry="6" fill="%230284c7"/>
    <ellipse cx="60" cy="45" rx="4.5" ry="6" fill="%230284c7"/>
    <circle cx="41.5" cy="43" r="1.8" fill="%23ffffff"/>
    <circle cx="61.5" cy="43" r="1.8" fill="%23ffffff"/>
    <!-- Smile -->
    <path d="M 44 54 Q 50 58 56 54" stroke="%23b91c1c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <!-- Shoulders / Jacket -->
    <path d="M 22 88 C 22 68 36 68 50 68 C 64 68 78 68 78 88 Z" fill="%231e293b"/>
    <path d="M 40 68 L 50 82 L 60 68 Z" fill="%23fed7aa"/>
  </svg>`,

  // Player Avatar (ElGibbo)
  playerAvatarSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="pGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="%230ea5e9"/>
        <stop offset="100%" stop-color="%230369a1"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="16" fill="url(%23pGrad)"/>
    <!-- Head -->
    <circle cx="50" cy="44" r="22" fill="%23ffedd5"/>
    <!-- Hair -->
    <path d="M 26 40 C 26 18 42 16 50 16 C 60 16 74 20 74 38 C 70 30 62 26 50 26 C 36 26 30 32 26 40 Z" fill="%23451a03"/>
    <!-- Beard -->
    <path d="M 33 46 C 33 66 67 66 67 46 C 67 60 33 60 33 46 Z" fill="%23451a03"/>
    <!-- Eyes -->
    <circle cx="41" cy="42" r="3" fill="%230f172a"/>
    <circle cx="59" cy="42" r="3" fill="%230f172a"/>
    <!-- Glasses -->
    <rect x="34" y="37" width="14" height="11" rx="2" fill="none" stroke="%230f172a" stroke-width="1.8"/>
    <rect x="52" y="37" width="14" height="11" rx="2" fill="none" stroke="%230f172a" stroke-width="1.8"/>
    <line x1="48" y1="42" x2="52" y2="42" stroke="%230f172a" stroke-width="1.8"/>
    <!-- Smile -->
    <path d="M 45 52 Q 50 56 55 52" stroke="%230f172a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <!-- Shirt -->
    <path d="M 20 90 C 20 70 35 70 50 70 C 65 70 80 70 80 90 Z" fill="%23f8fafc"/>
  </svg>`,

  // Acrylic Condition Coins
  coins: {
    poison: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
      <defs>
        <radialGradient id="pCoin" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="%23c084fc"/>
          <stop offset="50%" stop-color="%237e22ce"/>
          <stop offset="100%" stop-color="%233b0764"/>
        </radialGradient>
      </defs>
      <circle cx="30" cy="30" r="27" fill="url(%23pCoin)" stroke="%23d8b4fe" stroke-width="2.5"/>
      <circle cx="30" cy="30" r="21" fill="none" stroke="%23a855f7" stroke-width="1" stroke-dasharray="3,2"/>
      <text x="30" y="38" font-size="20" text-anchor="middle" fill="%23ffffff">☠️</text>
    </svg>`,

    burn: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
      <defs>
        <radialGradient id="bCoin" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="%23fdba74"/>
          <stop offset="50%" stop-color="%23ea580c"/>
          <stop offset="100%" stop-color="%237c2d12"/>
        </radialGradient>
      </defs>
      <circle cx="30" cy="30" r="27" fill="url(%23bCoin)" stroke="%23fed7aa" stroke-width="2.5"/>
      <circle cx="30" cy="30" r="21" fill="none" stroke="%23f97316" stroke-width="1" stroke-dasharray="3,2"/>
      <text x="30" y="38" font-size="20" text-anchor="middle" fill="%23ffffff">🔥</text>
    </svg>`,

    darkness: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
      <defs>
        <radialGradient id="dCoin" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="%2394a3b8"/>
          <stop offset="60%" stop-color="%23334155"/>
          <stop offset="100%" stop-color="%230f172a"/>
        </radialGradient>
      </defs>
      <circle cx="30" cy="30" r="27" fill="url(%23dCoin)" stroke="%23cbd5e1" stroke-width="2.5"/>
      <circle cx="30" cy="30" r="21" fill="none" stroke="%2364748b" stroke-width="1"/>
      <text x="30" y="38" font-size="18" text-anchor="middle" fill="%23ffffff">👁️</text>
    </svg>`
  }
};
