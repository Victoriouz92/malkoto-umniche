/** Four-connected light regions bounded by the original outlines. Border areas are paper. */
export function findRegions(data: Uint8ClampedArray, width: number, height: number) {
  const labels = new Int32Array(width * height);
  const regions: number[][] = [];
  const queue = new Int32Array(labels.length);
  const light = (p: number) =>
    data[p * 4]! > 180 && data[p * 4 + 1]! > 180 && data[p * 4 + 2]! > 180;
  for (let seed = 0; seed < labels.length; seed++) {
    if (labels[seed] || !light(seed)) continue;
    let head = 0;
    let tail = 1;
    let exterior = false;
    queue[0] = seed;
    labels[seed] = -1;
    while (head < tail) {
      const p = queue[head++]!;
      const x = p % width;
      const y = Math.floor(p / width);
      if (!x || !y || x === width - 1 || y === height - 1) exterior = true;
      const visit = (next: number) => {
        if (!labels[next] && light(next)) {
          labels[next] = -1;
          queue[tail++] = next;
        }
      };
      if (x) visit(p - 1);
      if (x < width - 1) visit(p + 1);
      if (y) visit(p - width);
      if (y < height - 1) visit(p + width);
    }
    if (exterior || tail < 9) continue;
    const pixels = Array.from(queue.subarray(0, tail));
    regions.push(pixels);
    for (const p of pixels) labels[p] = regions.length;
  }
  return { labels, regions };
}
