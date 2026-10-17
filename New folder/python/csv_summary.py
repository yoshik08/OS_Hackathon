import csv
from pathlib import Path

def summarize_csv(path):
    with Path(path).open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return {"rows": len(rows), "columns": list(rows[0]) if rows else []}

if __name__ == "__main__":
    print("Usage: call summarize_csv('your_file.csv') from Python")
