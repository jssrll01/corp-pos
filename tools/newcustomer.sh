#!/bin/sh
[ -n "$1" ] || { echo 'usage: sh tools/newcustomer.sh "Business Name"'; exit 1; }
cd "$(dirname "$0")/.." || exit 1
k=$(node tools/keygen.mjs "$1") || exit 1
echo "$(date +%F) | $1 | $k" >> ~/pos-licenses.txt
echo "Business: $1"
echo "Key: $k"
