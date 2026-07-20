// Name: AES 加密
// Description: 对称加密，使用密码保护消息
// Avatar: 🔐

function get_config_schema() {
    return {
        params: [
            {
                name: "password",
                label: "密码 (Password)",
                type: "password",
                placeholder: "请输入加密密码..."
            }
        ]
    };
}

async function getKey(password) {
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    return crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
}

async function encode(text) {
    if (!text) return '';

    const password = (SCRIPT_CONFIG.password || '').trim();
    if (!password) {
        throw new Error("请先在设置中配置【密码】才能进行加密");
    }

    try {
        const key = await getKey(password);
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encoder = new TextEncoder();
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-CBC', iv: iv },
            key,
            encoder.encode(text)
        );

        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        let binary = '';
        for (let i = 0; i < combined.length; i++) {
            binary += String.fromCharCode(combined[i]);
        }
        return btoa(binary);
    } catch (e) {
        throw new Error("加密错误: " + (e.message || String(e)));
    }
}

async function decode(text) {
    if (!text) return '';

    const password = (SCRIPT_CONFIG.password || '').trim();
    if (!password) {
        throw new Error("请先在设置中配置【密码】才能进行解密");
    }

    try {
        let binary;
        try {
            binary = atob(text);
        } catch (e) {
            throw new Error("输入不是有效的Base64编码");
        }

        const combined = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            combined[i] = binary.charCodeAt(i);
        }

        if (combined.length < 16) {
            throw new Error("数据长度错误，可能已损坏");
        }

        const iv = combined.slice(0, 16);
        const ciphertext = combined.slice(16);

        const key = await getKey(password);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv: iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        const msg = e.message || String(e);
        if (msg.indexOf("解密失败") !== -1 || msg.indexOf("数据长度") !== -1 || msg.indexOf("输入不是") !== -1) {
            throw e;
        }
        throw new Error("解密失败: 密码错误");
    }
}
