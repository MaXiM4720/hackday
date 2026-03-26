export const formatTimestamp = (timestamp: number): string =>
  new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
