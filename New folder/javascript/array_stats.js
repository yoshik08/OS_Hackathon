const numbers = [4, 8, 2, 9, 5];

const sum = numbers.reduce((total, n) => total + n, 0);
const average = sum / numbers.length;

console.log({ sum, average, min: Math.min(...numbers), max: Math.max(...numbers) });
