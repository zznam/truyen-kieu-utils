import requests
import json
import os
from pathlib import Path


def download_and_process_truyen_kieu():
    try:
        url = "https://huggingface.co/datasets/harryph/datasets/raw/015cc39f8556b4d6a1a3b0ab6367606d292672b7/truyenkieu.txt"
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes

        # Split the text into lines and filter out empty lines
        lines = [line.strip() for line in response.text.split("\n") if line.strip()]

        # Convert to array of objects with id and text
        verses = [{"id": i + 1, "text": line} for i, line in enumerate(lines)]

        # Create output directory if it doesn't exist
        output_dir = Path("app/data")
        output_dir.mkdir(parents=True, exist_ok=True)

        # Write to JSON file
        output_path = output_dir / "truyen-kieu.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(verses, f, ensure_ascii=False, indent=2)

        print(f"Successfully processed {len(verses)} verses and saved to {output_path}")

    except Exception as e:
        print(f"Error downloading or processing Truyện Kiều: {e}")


if __name__ == "__main__":
    download_and_process_truyen_kieu()
