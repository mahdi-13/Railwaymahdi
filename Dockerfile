FROM alpine:latest

# نصب ابزارهای مورد نیاز
RUN apk add --no-cache ca-certificates curl

# دانلود و نصب آخرین نسخه Xray
RUN bash -c "$(curl -L https://github.com/XTLS/Xray-core/raw/main/install-release.sh)" @ install

# کپی کردن فایل کانفیگ
COPY config.json /etc/xray/config.json

# اسکریپت برای تغییر پورت بر اساس متغیر Railway
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
