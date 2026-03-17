#!/bin/bash
# Create all Know AI team mailboxes
PASSWORD="knowai123"

USERS=(
  darshan zeel aakash het harshit kanak zaid
  vishal kunal yash jaydev jaimin kunj mohit pritesh
)

for user in "${USERS[@]}"; do
  bash /opt/knowai-erp/scripts/create-mailbox.sh "${user}@knowai.club" "$PASSWORD"
done

echo ""
echo "All mailboxes created with password: $PASSWORD"
echo "Users should change passwords after first login."
