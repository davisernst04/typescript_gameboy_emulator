export const log = {
  start: 0,

  reset: () => {
    const date: Date = new Date();
    log.start = date.getTime();
  },

  out: (module: string, message: string) => {
    const date: Date = new Date();
    console.log(`[${(date.getTime() - log.start) / 1000}] ${module}: ${message}`);
  },
};
