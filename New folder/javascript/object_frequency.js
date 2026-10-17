function frequency(items) {
  return items.reduce((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {});
}

console.log(frequency(["a", "b", "a", "c", "b", "a"]));
