#!/bin/bash
# Create a mailbox for a knowai.club user
# Usage: bash create-mailbox.sh user@knowai.club password

EMAIL=$1
PASSWORD=$2
USERNAME=$(echo $EMAIL | cut -d@ -f1)

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: bash create-mailbox.sh user@knowai.club password"
  exit 1
fi

# Create system user if not exists
if ! id "$USERNAME" &>/dev/null; then
  useradd -m -s /usr/sbin/nologin "$USERNAME"
  echo "$USERNAME:$PASSWORD" | chpasswd
  mkdir -p /home/$USERNAME/Maildir/{new,cur,tmp}
  chown -R $USERNAME:$USERNAME /home/$USERNAME/Maildir
  echo "Created mailbox: $EMAIL"
else
  echo "$USERNAME:$PASSWORD" | chpasswd
  echo "Updated password for: $EMAIL"
fi
