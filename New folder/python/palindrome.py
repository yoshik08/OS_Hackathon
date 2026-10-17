def is_palindrome(text):
    cleaned = ''.join(ch.lower() for ch in text if ch.isalnum())
    return cleaned == cleaned[::-1]

if __name__ == "__main__":
    print(is_palindrome("Never odd or even"))
