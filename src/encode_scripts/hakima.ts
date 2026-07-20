// Name: 哈基码
// Description: 网络流行的哈基米编码字符集
// Avatar: 🤖

const CHARS = [
    '哈', '基', '米', '南', '北', '绿', '豆', '阿', '西', '噶', '压', '库', '那', '鲁', '曼', '波',
    '欧', '马', '自', '立', '悠', '嗒', '步', '诺', '斯', '哇', '嗷', '冰', '踩', '背', '叮', '咚',
    '鸡', '大', '狗', '叫', '袋', '鼠', '兴', '奋', '剂', '出', '示', '健', '康', '码', '楼', '上',
    '下', '来', '带', '一', '段', '小', '白', '手', '套', '胖', '宝', '牛', '魔', '呵', '嘿', '喔'
];

const STANDARD_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUtf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

function encode(text) {
    if (!text) return '';

    const base64Str = utf8ToBase64(text);
    let result = '';

    for (const char of base64Str) {
        const index = STANDARD_CHARS.indexOf(char);
        if (index !== -1) {
            result += CHARS[index % CHARS.length];
        } else {
            result += char; // Keep padding '='
        }
    }

    return result;
}

function decode(text) {
    if (!text) return '';

    let base64Str = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (/\s/.test(char)) continue;

        if (char === '=') {
            base64Str += '=';
            continue;
        }

        const index = CHARS.indexOf(char);
        if (index === -1) {
            throw new Error('解码失败：位置 ' + i + " 处发现无法识别的字符 '" + char + "'，请检查输入。");
        }
        base64Str += STANDARD_CHARS[index];
    }

    if (!base64Str) {
        throw new Error("解码失败：未找到有效的哈基码编码内容。");
    }

    try {
        return base64ToUtf8(base64Str);
    } catch (e) {
        throw new Error("解码失败：内部Base64解码错误 (" + (e.message || String(e)) + ")");
    }
}
