const durationUnitMilliseconds = {
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

type DurationUnit = keyof typeof durationUnitMilliseconds;

export type DurationString = `${number} ${DurationUnit}${"" | "s"}`;

// Parses quota duration strings into validated millisecond windows.
export function parseDuration(value: DurationString) {
  const match =
    /^([1-9]\d*) (minute|minutes|hour|hours|day|days|week|weeks|year|years)$/.exec(
      value,
    );

  if (!match) {
    throw new TypeError(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2].replace(/s$/, "") as DurationUnit;
  const milliseconds = amount * durationUnitMilliseconds[unit];

  if (!Number.isSafeInteger(milliseconds)) {
    throw new RangeError(`Duration is too large: ${value}`);
  }

  return milliseconds;
}
