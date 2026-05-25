function pad(value) {
  return String(value).padStart(2, '0');
}

function getToday() {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) && value === getDateString(date);
}

function getDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getCurrentYearMonth() {
  const today = getToday();
  const [year, month] = today.split('-').map(Number);

  return { year, month };
}

module.exports = {
  getToday,
  isValidDate,
  getCurrentYearMonth,
};
