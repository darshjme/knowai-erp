#!/bin/bash
# Know AI CRM - Email Server Setup Script
# Installs Postfix + Dovecot + OpenDKIM + SpamAssassin on Debian/Ubuntu
# Domain: knowai.club | Server: mail.knowai.club

set -e
DOMAIN="knowai.club"
HOSTNAME="mail.knowai.club"
ADMIN_EMAIL="admin@knowai.club"

echo "============================================"
echo "  Know AI Email Server Setup"
echo "  Domain: $DOMAIN"
echo "  Hostname: $HOSTNAME"
echo "============================================"

# Set hostname
hostnamectl set-hostname $HOSTNAME
echo "$HOSTNAME" > /etc/hostname

# Install packages
echo "[1/8] Installing packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections
echo "postfix postfix/mailname string $DOMAIN" | debconf-set-selections
apt-get install -y postfix dovecot-core dovecot-imapd dovecot-pop3d dovecot-lmtpd \
  opendkim opendkim-tools spamassassin spamc mailutils certbot 2>&1 | tail -3

# SSL cert for mail
echo "[2/8] Setting up SSL..."
certbot certonly --standalone -d $HOSTNAME --non-interactive --agree-tos -m $ADMIN_EMAIL 2>/dev/null || \
certbot certonly --nginx -d $HOSTNAME --non-interactive --agree-tos -m $ADMIN_EMAIL 2>/dev/null || \
echo "SSL cert may already exist or needs manual setup"

SSL_CERT="/etc/letsencrypt/live/$HOSTNAME/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/$HOSTNAME/privkey.pem"
if [ ! -f "$SSL_CERT" ]; then
  SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
fi

# Configure Postfix
echo "[3/8] Configuring Postfix..."
cat > /etc/postfix/main.cf << POSTFIX
# Know AI Email Server
smtpd_banner = \$myhostname ESMTP Know AI Mail
biff = no
append_dot_mydomain = no
readme_directory = no
compatibility_level = 3.6

# TLS
smtpd_tls_cert_file=$SSL_CERT
smtpd_tls_key_file=$SSL_KEY
smtpd_tls_security_level = may
smtpd_tls_auth_only = yes
smtp_tls_security_level = may
smtp_tls_loglevel = 1

# SASL Auth
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = \$myhostname

# Restrictions
smtpd_recipient_restrictions = permit_sasl_authenticated, permit_mynetworks, reject_unauth_destination
smtpd_relay_restrictions = permit_sasl_authenticated, permit_mynetworks, reject_unauth_destination

# Network
myhostname = $HOSTNAME
mydomain = $DOMAIN
myorigin = \$mydomain
mydestination = \$myhostname, \$mydomain, localhost
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
inet_interfaces = all
inet_protocols = all

# Mailbox
home_mailbox = Maildir/
mailbox_size_limit = 0
recipient_delimiter = +

# DKIM
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:127.0.0.1:8891
non_smtpd_milters = inet:127.0.0.1:8891

# Virtual
virtual_alias_maps = hash:/etc/postfix/virtual
POSTFIX

# Enable submission port (587)
cat > /etc/postfix/master.cf << 'MASTER'
smtp      inet  n       -       y       -       -       smtpd
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_tls_auth_only=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
smtps     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
pickup    unix  n       -       y       60      1       pickup
cleanup   unix  n       -       y       -       0       cleanup
qmgr      unix  n       -       n       300     1       qmgr
tlsmgr    unix  -       -       y       1000?   1       tlsmgr
rewrite   unix  -       -       y       -       -       trivial-rewrite
bounce    unix  -       -       y       -       0       bounce
defer     unix  -       -       y       -       0       bounce
trace     unix  -       -       y       -       0       bounce
verify    unix  -       -       y       -       1       verify
flush     unix  n       -       y       1000?   0       flush
proxymap  unix  -       -       n       -       -       proxymap
proxywrite unix -       -       n       -       1       proxymap
smtp      unix  -       -       y       -       -       smtp
relay     unix  -       -       y       -       -       smtp
showq     unix  n       -       y       -       -       showq
error     unix  -       -       y       -       -       error
retry     unix  -       -       y       -       -       error
discard   unix  -       -       y       -       -       discard
local     unix  -       n       n       -       -       local
virtual   unix  -       n       n       -       -       virtual
lmtp      unix  -       -       y       -       -       lmtp
anvil     unix  -       -       y       -       1       anvil
scache    unix  -       -       y       -       1       scache
postlog   unix-dgram n  -       n       -       1       postlogd
MASTER

# Virtual aliases
touch /etc/postfix/virtual
postmap /etc/postfix/virtual

# Configure Dovecot
echo "[4/8] Configuring Dovecot..."
cat > /etc/dovecot/dovecot.conf << 'DOVECOT'
protocols = imap lmtp
listen = *, ::
mail_location = maildir:~/Maildir
namespace inbox {
  inbox = yes
}
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0666
    user = postfix
    group = postfix
  }
}
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0600
    user = postfix
    group = postfix
  }
}
auth_mechanisms = plain login
passdb {
  driver = pam
}
userdb {
  driver = passwd
}
ssl = required
ssl_cert = <SSL_CERT_PLACEHOLDER
ssl_key = <SSL_KEY_PLACEHOLDER
DOVECOT

sed -i "s|SSL_CERT_PLACEHOLDER|$SSL_CERT|" /etc/dovecot/dovecot.conf
sed -i "s|SSL_KEY_PLACEHOLDER|$SSL_KEY|" /etc/dovecot/dovecot.conf

# Configure OpenDKIM
echo "[5/8] Configuring DKIM..."
mkdir -p /etc/opendkim/keys/$DOMAIN
opendkim-genkey -s mail -d $DOMAIN -D /etc/opendkim/keys/$DOMAIN
chown -R opendkim:opendkim /etc/opendkim

cat > /etc/opendkim.conf << DKIM
AutoRestart             Yes
AutoRestartRate         10/1h
Syslog                  yes
SyslogSuccess           Yes
LogWhy                  Yes
Canonicalization        relaxed/simple
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
KeyTable                refile:/etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
Mode                    sv
PidFile                 /var/run/opendkim/opendkim.pid
SignatureAlgorithm      rsa-sha256
UserID                  opendkim:opendkim
Socket                  inet:8891@localhost
DKIM

echo "mail._domainkey.$DOMAIN $DOMAIN:mail:/etc/opendkim/keys/$DOMAIN/mail.private" > /etc/opendkim/KeyTable
echo "*@$DOMAIN mail._domainkey.$DOMAIN" > /etc/opendkim/SigningTable
echo -e "127.0.0.1\nlocalhost\n$HOSTNAME\n*.$DOMAIN" > /etc/opendkim/TrustedHosts

# SpamAssassin
echo "[6/8] Configuring SpamAssassin..."
systemctl enable spamassassin
systemctl start spamassassin

# Firewall
echo "[7/8] Opening ports..."
if command -v ufw &>/dev/null; then
  ufw allow 25/tcp    # SMTP
  ufw allow 587/tcp   # Submission
  ufw allow 465/tcp   # SMTPS
  ufw allow 993/tcp   # IMAPS
  ufw allow 143/tcp   # IMAP
fi

# Start services
echo "[8/8] Starting services..."
systemctl enable postfix dovecot opendkim
systemctl restart postfix dovecot opendkim

echo ""
echo "============================================"
echo "  Email Server Setup Complete!"
echo "============================================"
echo ""
echo "  SMTP: mail.knowai.club:587 (STARTTLS)"
echo "  IMAP: mail.knowai.club:993 (SSL)"
echo ""
echo "  DKIM Record (add to DNS):"
cat /etc/opendkim/keys/$DOMAIN/mail.txt
echo ""
echo "  Next steps:"
echo "  1. Add DNS records (MX, SPF, DKIM, DMARC)"
echo "  2. Create mailboxes: bash scripts/create-mailbox.sh user@knowai.club password"
echo "  3. Update CRM Admin Panel → Email Server settings"
echo "============================================"
