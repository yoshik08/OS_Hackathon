def is_prime(n):
    if n < 2:
        return False
    divisor = 2
    while divisor * divisor <= n:
        if n % divisor == 0:
            return False
        divisor += 1
    return True

if __name__ == "__main__":
    print([n for n in range(30) if is_prime(n)])
