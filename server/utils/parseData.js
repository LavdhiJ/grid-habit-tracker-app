import * as chrono from 'chrono-node'

export const extractDateFromText = (text) => {
  const parsed = chrono.parseDate(text);
  return parsed || null;
};
