export const CATEGORIES = [
  { name: "Violões", icon: "🪕" },
  { name: "Guitarras", icon: "🎸" },
  { name: "Baixos", icon: "🎵" },
  { name: "Ukulele e cavaquinho", icon: "🎶" },
  { name: "Teclados e pianos", icon: "🎹" },
  { name: "Baterias e percussão", icon: "🥁" },
  { name: "Sopros", icon: "🎷" },
  { name: "Cordas de arco", icon: "🎻" },
  { name: "Amplificadores", icon: "🔊" },
  { name: "Pedais e efeitos", icon: "🎛️" },
  { name: "Microfones", icon: "🎤" },
  { name: "Áudio e gravação", icon: "🎧" },
  { name: "DJ e produção", icon: "💿" },
  { name: "Acessórios", icon: "🧰" },
];

export const LEVELS = ["Iniciante", "Intermediário", "Profissional"];

export function categoryIcon(name) {
  return CATEGORIES.find((item) => item.name === name)?.icon ?? "🎵";
}
