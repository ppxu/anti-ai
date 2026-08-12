function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function inclusiveDateRange(startDate, endDate) {
  const dates = [];
  for (
    let current = startDate;
    current <= endDate;
    current = shiftDate(current, 1)
  ) {
    dates.push(current);
  }
  return dates;
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export { inclusiveDateRange, isValidDate, shiftDate };
