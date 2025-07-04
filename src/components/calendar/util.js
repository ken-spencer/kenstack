function generateCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  let days = [];

  // Calculate days of previous month to display
  for (let i = firstDay; i > 0; i--) {
    days.unshift({
      day: prevMonthTotalDays - i + 1,
      currentMonth: false,
      month: month - 1,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    days.push({ day: i, currentMonth: true, month });
  }

  // Calculate days of next month to display to complete the week
  let nextMonthDaysToAdd = 7 - (days.length % 7);
  if (nextMonthDaysToAdd < 7) {
    for (let i = 1; i <= nextMonthDaysToAdd; i++) {
      days.push({ day: i, currentMonth: false, month: month + 1 });
    }
  }

  return days;
}

const getMonthNames = (locale) => {
  const monthNames = [];
  for (let month = 0; month < 12; month++) {
    const date = new Date(Date.UTC(2020, month, 1)); // Year is arbitrary; choose a leap year for full February
    monthNames.push(
      new Intl.DateTimeFormat(locale, { month: "long" }).format(date)
    );
  }
  return monthNames;
};

const getWeekdayNames = (locale) => {
  const weekdayNames = [];
  for (let day = 0; day < 7; day++) {
    const date = new Date(Date.UTC(2020, 5, day + 1)); // Year and month are arbitrary, start from Sunday
    weekdayNames.push(
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date)
    );
  }
  return weekdayNames;
};

export { getWeekdayNames, getMonthNames, generateCalendarDays };

// const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// get list of zones
// const zones = Intl.supportedValuesOf("timeZone");
