function isPalindrome(value) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === [...cleaned].reverse().join("");
}

console.log(isPalindrome("Never odd or even"));
