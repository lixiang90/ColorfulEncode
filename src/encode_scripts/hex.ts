// Name: Hex String
// Description: Convert text to Hex representation
// Avatar: 🔢

function encode(text) {
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function decode(text) {
    try {
        const hex = text.replace(/\s/g, '');
        if (hex.length % 2 !== 0) throw new Error("odd length");
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        if (bytes.some(isNaN)) throw new Error("invalid hex");
        return new TextDecoder().decode(bytes);
    } catch (e) {
        throw new Error("解码失败：无效的十六进制字符串");
    }
}
