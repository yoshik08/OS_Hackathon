from collections import Counter
import re

def count_words(text):
    words = re.findall(r"\b[\w']+\b", text.lower())
    return Counter(words)

if __name__ == "__main__":
    print(count_words("Code well. Code often; learn always!"))
