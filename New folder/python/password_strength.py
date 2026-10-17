import string

def password_strength(password):
    score = sum([
        len(password) >= 12,
        any(c.islower() for c in password),
        any(c.isupper() for c in password),
        any(c.isdigit() for c in password),
        any(c in string.punctuation for c in password),
    ])
    return ["very weak", "weak", "fair", "good", "strong", "strong"][score]

if __name__ == "__main__":
    print(password_strength("Example-Password-42"))
