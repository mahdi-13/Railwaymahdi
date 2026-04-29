#!/bin/sh

# جایگزینی پورت 8080 در کانفیگ با پورتی که Railway اختصاص داده است
sed -i "s/8080/$PORT/g" /etc/xray/config.json

# اجرای Xray
/usr/local/bin/xray run -c /etc/xray/config.json
