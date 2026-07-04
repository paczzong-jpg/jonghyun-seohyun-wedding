#!/bin/bash
BASE_URL="https://peeeeeach.com/sample/mb1"
OUTPUT_DIR="public/images"

images=(
  "2_main1.jpg"
  "3_savethedate.jpg"
  "4_envelope.jpg"
  "5_handwrite.jpg"
  "6_main2.jpg"
  "7_groom_fam.jpg"
  "8_bride_fam.jpg"
  "9_loveletter1.jpg"
  "10_loveletter2.jpg"
  "11_calendar.jpg"
  "12_map.jpg"
  "13_bank.jpg"
  "1_thumbnail.jpg"
  "1.jpg" "2.jpg" "3.jpg" "4.jpg" "5.jpg"
  "6.jpg" "7.jpg" "8.jpg" "9.jpg" "10.jpg"
  "11.jpg" "12.jpg" "13.jpg" "14.jpg" "15.jpg"
)

for img in "${images[@]}"; do
  echo "Downloading $img..."
  curl -sL "$BASE_URL/$img" -o "$OUTPUT_DIR/$img"
done

echo "Download complete!"
