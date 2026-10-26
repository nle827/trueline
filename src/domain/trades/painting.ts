import { makeLine, nonZero } from "./lineItem";
import type { LineItem, Markups, PaintRoom } from "./types";

/** Invented rate card for the demo company. */
export const PAINT_RATES = {
  markups: { material: 0.35, labor: 0.6, other: 0.2 } satisfies Markups,
  doorDeduction: 20, // sq ft
  windowDeduction: 15, // sq ft
  coverage: 350, // sq ft per gallon per coat
  paintPerGallon: 38,
  sundriesPerSqFt: 0.06, // tape, caulk, patch, rollers
  laborRate: 55, // per hour, crew cost
  sqFtPerHour: 160, // per coat
  prepHours: { light: 1, standard: 2.5, heavy: 5 },
  doorTrimHours: 0.75,
  windowTrimHours: 0.5,
  protectionPerRoom: 25,
  setupFee: 75,
} as const;

export function paintAreas(room: PaintRoom) {
  const r = PAINT_RATES;
  const walls = Math.max(
    0,
    2 * (room.length + room.width) * room.height -
      room.doors * r.doorDeduction -
      room.windows * r.windowDeduction,
  );
  const ceiling = room.ceiling ? room.length * room.width : 0;
  return { walls, ceiling, coated: (walls + ceiling) * room.coats };
}

export function paintLineItems(rooms: PaintRoom[]): LineItem[] {
  if (rooms.length === 0) return [];
  const r = PAINT_RATES;
  const line = makeLine.bind(null, "paint", r.markups);

  let coated = 0;
  let surface = 0;
  let prepHours = 0;
  let trimHours = 0;
  for (const room of rooms) {
    const a = paintAreas(room);
    coated += a.coated;
    surface += a.walls + a.ceiling;
    prepHours += r.prepHours[room.prep];
    trimHours += room.doors * r.doorTrimHours + room.windows * r.windowTrimHours;
  }
  const gallons = Math.ceil(coated / r.coverage);

  return nonZero([
    line("material", "paint", "Paint", gallons, "gal", r.paintPerGallon),
    line("material", "sundries", "Sundries (tape, caulk, patch)", Math.round(surface), "sq ft", r.sundriesPerSqFt),
    line("labor", "prep", "Surface prep", prepHours, "hr", r.laborRate),
    line("labor", "roll", "Cut-in and roll", coated / r.sqFtPerHour, "hr", r.laborRate),
    line("labor", "trim", "Doors and window trim", trimHours, "hr", r.laborRate),
    line("other", "protect", "Floor and furniture protection", rooms.length, "room", r.protectionPerRoom),
    line("other", "setup", "Setup and cleanup", 1, "job", r.setupFee),
  ]);
}
