/** Deterministic-friendly RNG wrapper. Defaults to Math.random. */
export const roll = (sides = 6): number => 1 + Math.floor(Math.random() * sides);

export const rollMany = (n: number, sides = 6): number[] => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(roll(sides));
  return out;
};
