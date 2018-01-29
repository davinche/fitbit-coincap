export function createLogger(prefix) {
  return {
    error: function(message, ...args) {
      console.error(`${prefix}: ${message}`, ...args);
    },
    info: function(message, ...args) {
      console.info(`${prefix}: ${message}`, ...args);
    },
    log: function(message, ...args) {
      console.log(`${prefix}: ${message}`, ...args);
    },
    warn: function(message, ...args) {
      console.warn(`${prefix}: ${message}`, ...args);
    }
  };
};