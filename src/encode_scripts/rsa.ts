// Name: RSA 加密
// Description: 非对称加密 (生成密钥、公钥加密、私钥解密)
// Avatar: 🔑

function get_config_schema() {
    return {
        params: [
            {
                name: "public_key",
                label: "公钥 (Public Key) - 用于加密",
                type: "textarea",
                placeholder: "-----BEGIN PUBLIC KEY-----..."
            },
            {
                name: "private_key",
                label: "私钥 (Private Key) - 用于解密",
                type: "textarea",
                placeholder: "-----BEGIN PRIVATE KEY-----..."
            }
        ],
        actions: [
            {
                name: "generate_keys",
                label: "生成新密钥对 (Generate New Keys)",
                type: "button"
            }
        ]
    };
}

function pemToArrayBuffer(pem) {
    const b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferToPem(buffer, type) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    const lines = b64.match(/.{1,64}/g).join('\n');
    return '-----BEGIN ' + type + '-----\n' + lines + '\n-----END ' + type + '-----';
}

async function generate_keys() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
    );
    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    return JSON.stringify({
        public_key: arrayBufferToPem(publicKey, 'PUBLIC KEY'),
        private_key: arrayBufferToPem(privateKey, 'PRIVATE KEY')
    });
}

async function encode(text) {
    if (!text) return '';

    const pubKeyPem = (SCRIPT_CONFIG.public_key || '').trim();
    if (!pubKeyPem) {
        throw new Error("请先在设置中配置公钥 (Public Key)");
    }

    try {
        const keyData = pemToArrayBuffer(pubKeyPem);
        const key = await crypto.subtle.importKey(
            'spki', keyData,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false, ['encrypt']
        );
        const encrypted = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            key,
            new TextEncoder().encode(text)
        );
        const bytes = new Uint8Array(encrypted);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    } catch (e) {
        const msg = e.message || String(e);
        if (msg.indexOf("请先") !== -1) throw e;
        throw new Error("加密错误: " + msg);
    }
}

async function decode(text) {
    if (!text) return '';

    const privKeyPem = (SCRIPT_CONFIG.private_key || '').trim();
    if (!privKeyPem) {
        throw new Error("请先在设置中配置私钥 (Private Key)");
    }

    try {
        let binary;
        try {
            binary = atob(text);
        } catch (e) {
            throw new Error("输入不是有效的Base64编码");
        }

        const ciphertext = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            ciphertext[i] = binary.charCodeAt(i);
        }

        const keyData = pemToArrayBuffer(privKeyPem);
        const key = await crypto.subtle.importKey(
            'pkcs8', keyData,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false, ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        const msg = e.message || String(e);
        if (msg.indexOf("请先") !== -1 || msg.indexOf("输入不是") !== -1) throw e;
        throw new Error("解密错误: " + msg + " (请检查私钥是否匹配)");
    }
}
