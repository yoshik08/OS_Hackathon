def unique_items(items):
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result

if __name__ == "__main__":
    print(unique_items([1, 2, 1, 3, 2, 4]))
