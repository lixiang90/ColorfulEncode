// Name: RSA (Friend)
// Description: 与朋友安全通信 (使用朋友公钥加密，自己私钥解密)
// Avatar: 🤝

function get_config_schema() {
    return {
        params: [
            {
                name: "friend_public_key",
                label: "朋友的公钥 (Friend's Public Key) - 用于发送加密消息",
                type: "textarea",
                placeholder: "-----BEGIN PUBLIC KEY-----..."
            },
            {
                name: "my_public_key",
                label: "我的公钥 (My Public Key) - 发送给朋友",
                type: "textarea",
                placeholder: "生成后自动填充，请发送给朋友...",
                readOnly: true
            },
            {
                name: "my_private_key",
                label: "我的私钥 (My Private Key) - 用于解密收到的消息",
                type: "textarea",
                placeholder: "生成后自动填充，请勿泄露...",
                readOnly: true
            }
        ],
        actions: [
            {
                name: "generate_keys",
                label: "生成我的密钥对 (Generate My Keys)",
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
        my_public_key: arrayBufferToPem(publicKey, 'PUBLIC KEY'),
        my_private_key: arrayBufferToPem(privateKey, 'PRIVATE KEY')
    });
}

async function encode(text) {
    if (!text) return '';

    const friendPubKey = (SCRIPT_CONFIG.friend_public_key || '').trim();
    if (!friendPubKey) {
        throw new Error("请先在设置中配置【朋友的公钥】才能发送加密消息");
    }

    try {
        const keyData = pemToArrayBuffer(friendPubKey);
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

    const myPrivKey = (SCRIPT_CONFIG.my_private_key || '').trim();
    if (!myPrivKey) {
        throw new Error("请先生成【我的密钥对】才能解密消息");
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

        const keyData = pemToArrayBuffer(myPrivKey);
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
        if (msg.indexOf("请先") !== -1 || msg.indexOf("请先生成") !== -1 || msg.indexOf("输入不是") !== -1) throw e;
        throw new Error("解密错误: " + msg + " (请确认这是发给您的消息)");
    }
}
