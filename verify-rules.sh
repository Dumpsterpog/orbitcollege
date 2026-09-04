#!/usr/bin/env bash
# Is the deployed ruleset the one in this repo?
#
# Reads nothing privileged: it asks Firestore to list a subcollection that only
# the campus-posts block grants, so a denial means that block is missing from
# whatever is currently published. Copy-pasting into the console silently keeps
# the old rules when the paste is incomplete or the Publish button is not
# pressed, and nothing in the app distinguishes that from a code bug -- this
# does.
set -euo pipefail
cd "$(dirname "$0")"
KEY=$(grep '^VITE_FIREBASE_API_KEY=' .env | cut -d= -f2)
PID=$(grep '^VITE_FIREBASE_PROJECT_ID=' .env | cut -d= -f2)
B="https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents"

probe() { curl -s "$1&key=${KEY}" | grep -q '"error"' && echo DENIED || echo allowed; }

echo "project        : ${PID}"
echo "campus posts   : $(probe "${B}/posts/probe/comments?pageSize=1")   (needs: allowed)"
echo "communities    : $(probe "${B}/communities?pageSize=1")   (needs: allowed)"
echo
echo "If campus posts is DENIED, the deployed rules are older than firestore.rules."
echo "Fix:  npx firebase login  &&  npx firebase deploy --only firestore:rules,firestore:indexes"
