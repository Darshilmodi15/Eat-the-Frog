export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatDateShort = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTimeForInput = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // If time is end of day (23:59:59), it means time was omitted
  if (hours === 23 && minutes === 59 && seconds === 59) return '';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const dueDate = new Date(dateStr);
  const now = new Date();
  return dueDate < now;
};

export const getDaysUntilDue = (dateStr) => {
  const dueDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Set dueDate time component to 0 to compare dates at calendar level
  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);
  
  const diffTime = dueDay - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getDueDateLabel = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // If time is 23:59:59, treat as no time specified
  const hasTime = !(hours === 23 && minutes === 59 && seconds === 59);

  const days = getDaysUntilDue(dateStr);
  
  // Format local calendar date: e.g. "15 June"
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const calendarLabel = `${day} ${month}`;

  let timeStr = '';
  if (hasTime) {
    let formattedHours = hours % 12;
    formattedHours = formattedHours ? formattedHours : 12; // 0 is 12
    const formattedMinutes = String(minutes).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    timeStr = `${formattedHours}:${formattedMinutes} ${ampm}`;
  }

  if (days < 0) {
    const overdueLabel = `${Math.abs(days)}d overdue`;
    return hasTime ? `${overdueLabel} (${timeStr})` : overdueLabel;
  }
  if (days === 0) {
    return hasTime ? `Due today at ${timeStr}` : 'Due today';
  }
  if (days === 1) {
    return hasTime ? `Due tomorrow at ${timeStr}` : 'Due tomorrow';
  }
  if (days <= 7) {
    return hasTime ? `${days}d left at ${timeStr}` : `${days}d left`;
  }
  return hasTime ? `${calendarLabel} ${timeStr}` : calendarLabel;
};
