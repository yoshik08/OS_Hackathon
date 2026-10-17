function debounce(callback, delayMs) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delayMs);
  };
}

const logLater = debounce((message) => console.log(message), 250);
logLater("runs after the calls stop");
