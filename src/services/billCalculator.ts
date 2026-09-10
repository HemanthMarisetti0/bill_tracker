export function calculateConsumption(
  previousReading: number,
  currentReading: number,
) {
  if (currentReading < previousReading) {
    throw new Error(
      "Current reading cannot be lower than previous reading",
    );
  }

  return currentReading - previousReading;
}

export function calculateAmount(
  consumption: number,
  rate: number,
) {
  return Number((consumption * rate).toFixed(2));
}