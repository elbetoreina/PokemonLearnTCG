export interface TrainerProfile {
  id: string;
  name: string;
  title: string;
  region: string;
  avatar: string;
}

export const POKEMON_TRAINERS: TrainerProfile[] = [
  { id: 'red', name: 'Red (Rojo)', title: 'Campeón Legendario', region: 'Kanto', avatar: 'assets/trainers/red.png' },
  { id: 'blue', name: 'Azul (Blue)', title: 'Campeón de Kanto', region: 'Kanto', avatar: 'assets/trainers/blue.png' },
  { id: 'cynthia', name: 'Cintia (Cynthia)', title: 'Campeona de Sinnoh', region: 'Sinnoh', avatar: 'assets/trainers/cynthia.png' },
  { id: 'steven', name: 'Máximo (Steven)', title: 'Campeón de Hoenn', region: 'Hoenn', avatar: 'assets/trainers/steven.png' },
  { id: 'lance', name: 'Lance', title: 'Maestro Dragón', region: 'Kanto / Johto', avatar: 'assets/trainers/lance.png' },
  { id: 'ash', name: 'Ash Ketchum', title: 'Campeón Mundial', region: 'Pueblo Paleta', avatar: 'assets/trainers/ash.png' },
  { id: 'leon', name: 'Lionel (Leon)', title: 'Campeón Invicto', region: 'Galar', avatar: 'assets/trainers/leon.png' },
  { id: 'misty', name: 'Misty', title: 'Líder Gimnasio Celeste', region: 'Kanto', avatar: 'assets/trainers/misty.png' },
  { id: 'brock', name: 'Brock', title: 'Líder Gimnasio Plateada', region: 'Kanto', avatar: 'assets/trainers/brock.png' },
  { id: 'giovanni', name: 'Giovanni', title: 'Líder Gimnasio / Team Rocket', region: 'Kanto', avatar: 'assets/trainers/giovanni.png' },
  { id: 'n', name: 'N (Harmonia)', title: 'Héroe de los Ideales', region: 'Teselia', avatar: 'assets/trainers/n.png' },
  { id: 'serena', name: 'Serena', title: 'Entrenadora de Kalos', region: 'Kalos', avatar: 'assets/trainers/serena.png' },
  { id: 'dawn', name: 'Maya (Dawn)', title: 'Entrenadora de Sinnoh', region: 'Sinnoh', avatar: 'assets/trainers/dawn.png' },
  { id: 'ethan', name: 'Eco (Ethan)', title: 'Campeón de Johto', region: 'Johto', avatar: 'assets/trainers/ethan.png' },
  { id: 'may', name: 'Aura (May)', title: 'Entrenadora de Hoenn', region: 'Hoenn', avatar: 'assets/trainers/may.png' }
];

export const POKEMON_PROFESSORS: TrainerProfile[] = [
  { id: 'oak', name: 'Profesor Oak', title: 'Profesor Pokémon de Kanto', region: 'Kanto', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/oak.png' },
  { id: 'elm', name: 'Profesor Elm', title: 'Profesor Pokémon de Johto', region: 'Johto', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/elm.png' },
  { id: 'birch', name: 'Profesor Birch', title: 'Profesor Pokémon de Hoenn', region: 'Hoenn', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/birch.png' },
  { id: 'rowan', name: 'Profesor Rowan', title: 'Profesor Pokémon de Sinnoh', region: 'Sinnoh', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/rowan.png' },
  { id: 'juniper', name: 'Profesora Juniper', title: 'Profesora Pokémon de Teselia', region: 'Teselia', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/juniper.png' },
  { id: 'sycamore', name: 'Profesor Sycamore', title: 'Profesor Pokémon de Kalos', region: 'Kalos', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/sycamore.png' },
  { id: 'kukui', name: 'Profesor Kukui', title: 'Profesor Pokémon de Alola', region: 'Alola', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/kukui.png' },
  { id: 'magnolia', name: 'Profesora Magnolia', title: 'Profesora Pokémon de Galar', region: 'Galar', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/magnolia.png' },
  { id: 'sada', name: 'Profesora Sada', title: 'Profesora del Pasado', region: 'Paldea', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/sada.png' },
  { id: 'turo', name: 'Profesor Turo', title: 'Profesor del Futuro', region: 'Paldea', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/turo.png' },
  { id: 'sonia', name: 'Profesora Sonia', title: 'Profesora Pokémon de Galar', region: 'Galar', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/sonia.png' },
  { id: 'laventon', name: 'Profesor Laventon', title: 'Profesor Pokémon de Hisui', region: 'Hisui', avatar: 'https://play.pokemonshowdown.com/sprites/trainers/laventon.png' }
];

export function getRandomProfessor(excludeId?: string): TrainerProfile {
  const available = excludeId ? POKEMON_PROFESSORS.filter(p => p.id !== excludeId) : POKEMON_PROFESSORS;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

export function findProfessorByNameOrId(nameOrId?: string | null): TrainerProfile | undefined {
  if (!nameOrId) return undefined;
  const lower = nameOrId.toLowerCase();
  return POKEMON_PROFESSORS.find(p =>
    p.id.toLowerCase() === lower ||
    lower.includes(p.id) ||
    lower.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().includes(lower)
  );
}

export function getRandomTrainer(excludeId?: string): TrainerProfile {
  const available = excludeId ? POKEMON_TRAINERS.filter(t => t.id !== excludeId) : POKEMON_TRAINERS;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

export function getTrainerForUser(username?: string | null): TrainerProfile {
  const u = (username || '').toLowerCase();
  if (u.includes('jugadorpokemon2')) {
    return POKEMON_TRAINERS.find(t => t.id === 'blue') || POKEMON_TRAINERS[1];
  }
  if (u.includes('jugadorpokemon')) {
    return POKEMON_TRAINERS.find(t => t.id === 'red') || POKEMON_TRAINERS[0];
  }
  // Default to a random iconic trainer
  return getRandomTrainer();
}

export function findTrainerByName(name?: string | null): TrainerProfile | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  const trainer = POKEMON_TRAINERS.find(t => 
    t.name.toLowerCase() === lower ||
    lower.includes(t.id) ||
    lower.includes(t.name.toLowerCase()) ||
    t.name.toLowerCase().includes(lower)
  );
  if (trainer) return trainer;

  // Fallback to professors
  return findProfessorByNameOrId(name);
}
