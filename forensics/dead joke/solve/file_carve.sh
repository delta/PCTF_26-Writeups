#!/usr/bin/env bash
set -euo pipefail

IN="smile.bin"
OUTDIR="carved_files"
mkdir -p "$OUTDIR"
cp "$IN" "$OUTDIR/smile_fixed.bin"
printf 'RIFF' | dd of="$OUTDIR/smile_fixed.bin" bs=1 seek=0 count=4 conv=notrunc status=none

seven_sig=$'\x37\x7a\xbc\xaf\x27\x1c'
seven_match=$(grep -aob -- "$seven_sig" "$OUTDIR/smile_fixed.bin" || true)
if [ -z "$seven_match" ]; then
  echo "7z signature not found"; exit 1
fi
seven_start=$(echo "$seven_match" | head -n1 | cut -d: -f1)

last_printable_line=$(strings -n 4 -t d "$OUTDIR/smile_fixed.bin" | tail -n 1 || true)
if [ -z "$last_printable_line" ]; then
  echo "no printable marker found"; exit 1
fi
marker_offset=$(echo "$last_printable_line" | awk '{print $1}')
marker_str=$(echo "$last_printable_line" | cut -d' ' -f2-)

dd if="$OUTDIR/smile_fixed.bin" of="$OUTDIR/recovered.wav" bs=1 count=$seven_start status=none

if [ "$marker_offset" -le "$seven_start" ]; then
  echo "marker occurs before 7z start; aborting"; exit 1
fi

seven_len=$((marker_offset - seven_start))
dd if="$OUTDIR/smile_fixed.bin" of="$OUTDIR/carved_archive.7z" bs=1 skip=$seven_start count=$seven_len status=none

echo "secret: $marker_str"

gpg_start=$((marker_offset + ${#marker_str}))
next_byte=$(dd if="$OUTDIR/smile_fixed.bin" bs=1 skip=$gpg_start count=1 status=none | od -An -t u1 | tr -d ' ' || true)
if [ -n "$next_byte" ] && [ "$next_byte" -eq 10 ]; then
  gpg_start=$((gpg_start + 1))
fi

dd if="$OUTDIR/smile_fixed.bin" of="$OUTDIR/encode.txt.gpg" bs=1 skip=$gpg_start status=none
ls -l "$OUTDIR"
