{
    "log": {
        "loglevel": "warning"
    },
    "inbounds": [
        {
            "port": 8080, 
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "a8e3ba73-ef8a-4bb0-eaf1-6035ae75d224",
                        "level": 0
                    }
                ],
                "decryption": "none"
            },
            "streamSettings": {
                "network": "xhttp",
                "xhttpSettings": {
                    "path": "/mahdi",
                    "mode": "auto"
                }
            }
        }
    ],
    "outbounds": [
        {
            "protocol": "freedom"
        }
    ]
}
