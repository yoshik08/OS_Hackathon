def selection_sort(values):
    values = list(values)
    for i in range(len(values)):
        smallest = min(range(i, len(values)), key=values.__getitem__)
        values[i], values[smallest] = values[smallest], values[i]
    return values

if __name__ == "__main__":
    print(selection_sort([8, 3, 5, 1, 4]))
