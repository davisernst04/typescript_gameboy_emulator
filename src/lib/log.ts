export const log = {
  start: 0,

  reset: () => {
    const date: Date = new Date();
    log.start = date.getTime();
  },

  out: (module,
};
