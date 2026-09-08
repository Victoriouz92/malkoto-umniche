/** The same assembly coordinates drive the game and its catalogue preview. */
export type BuildingPiece = { shape: 'square' | 'triangle' | 'circle' | 'heart'; color: string; x: number; y: number; size: number; rotation?: number };
export const BLUEPRINTS = {
  house: { label: 'къщичка', pieces: [
    { shape: 'square', color: 'yellow', x: 50, y: 59, size: 48 },
    { shape: 'triangle', color: 'red', x: 50, y: 30, size: 61 },
    { shape: 'square', color: 'teal', x: 50, y: 73, size: 18 },
    { shape: 'square', color: 'blue', x: 35, y: 52, size: 13 },
    { shape: 'square', color: 'blue', x: 65, y: 52, size: 13 },
  ] },
  rocket: { label: 'ракета', pieces: [
    { shape: 'triangle', color: 'orange', x: 50, y: 82, size: 29, rotation: 180 },
    { shape: 'triangle', color: 'red', x: 32, y: 67, size: 33 },
    { shape: 'triangle', color: 'red', x: 68, y: 67, size: 33 },
    { shape: 'square', color: 'teal', x: 50, y: 53, size: 41 },
    { shape: 'triangle', color: 'red', x: 50, y: 24, size: 47 },
    { shape: 'circle', color: 'blue', x: 50, y: 48, size: 20 },
  ] },
  flower: { label: 'цвете', pieces: [
    { shape: 'heart', color: 'green', x: 64, y: 74, size: 31, rotation: 45 },
    { shape: 'heart', color: 'green', x: 36, y: 80, size: 31, rotation: -45 },
    { shape: 'circle', color: 'pink', x: 35, y: 31, size: 30 },
    { shape: 'circle', color: 'pink', x: 65, y: 31, size: 30 },
    { shape: 'circle', color: 'pink', x: 35, y: 53, size: 30 },
    { shape: 'circle', color: 'pink', x: 65, y: 53, size: 30 },
    { shape: 'circle', color: 'yellow', x: 50, y: 42, size: 32 },
  ] },
} satisfies Record<string, { label: string; pieces: BuildingPiece[] }>;
export type BlueprintId = keyof typeof BLUEPRINTS;
