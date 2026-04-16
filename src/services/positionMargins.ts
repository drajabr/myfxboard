const toNum = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

type PositionLike = {
  size?: number;
  entry_price?: number | null;
  current_price?: number | null;
  margin?: number | null;
};

const getWeight = (position: PositionLike): number => {
  const size = Math.abs(toNum(position.size, 0));
  const price = Math.abs(toNum(position.current_price ?? position.entry_price, 0));
  return size * Math.max(price, 1);
};

export function allocateMissingPositionMargins<T extends PositionLike>(
  positions: T[],
  totalMarginUsed: number
): T[] {
  if (!Array.isArray(positions) || positions.length === 0) {
    return positions;
  }

  const normalizedTotalMargin = toNum(totalMarginUsed, 0);
  if (!(normalizedTotalMargin > 0)) {
    return positions;
  }

  const presentMarginSum = positions.reduce((sum, position) => {
    const margin = toNum(position.margin, 0);
    return margin > 0 ? sum + margin : sum;
  }, 0);

  const remainingMargin = Math.max(0, normalizedTotalMargin - presentMarginSum);
  const missingIndexes = positions
    .map((position, index) => ({ index, margin: toNum(position.margin, 0) }))
    .filter((entry) => !(entry.margin > 0))
    .map((entry) => entry.index);

  if (missingIndexes.length === 0 || !(remainingMargin > 0)) {
    return positions;
  }

  const weights = missingIndexes.map((index) => getWeight(positions[index]));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const fallbackWeight = totalWeight > 0 ? totalWeight : missingIndexes.length;

  let allocatedSoFar = 0;
  return positions.map((position, index) => {
    if (!missingIndexes.includes(index)) {
      return position;
    }

    const missingOffset = missingIndexes.indexOf(index);
    const isLastMissing = missingOffset === missingIndexes.length - 1;
    const weight = totalWeight > 0 ? weights[missingOffset] : 1;
    const allocatedMargin = isLastMissing
      ? Math.max(0, remainingMargin - allocatedSoFar)
      : (remainingMargin * weight) / fallbackWeight;

    allocatedSoFar += allocatedMargin;

    return {
      ...position,
      margin: allocatedMargin,
    };
  });
}