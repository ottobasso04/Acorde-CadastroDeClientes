export const INSTRUMENTS = [
  { name: "Cordas", icon: "🎸" },
  { name: "Teclas", icon: "🎹" },
  { name: "Percussão", icon: "🥁" },
  { name: "Sopro", icon: "🎷" },
  { name: "Áudio", icon: "🎧" },
  { name: "Acessórios", icon: "🎼" },
];

export function instrumentIcon(name) {
  return INSTRUMENTS.find((item) => item.name === name)?.icon ?? "🎵";
}
