// Name: 报菜名
// Description: 相声《报菜名》中的经典菜名
// Avatar: 🍽️

const CHARS = [
    '蒸羊羔', '蒸熊掌', '蒸鹿尾儿', '烧花鸭', '烧雏鸡', '烧子鹅', '卤猪', '卤鸭',
    '酱鸡', '腊肉', '松花小肚儿', '晾肉', '香肠儿', '什锦苏盘儿', '熏鸡白肚儿', '清蒸八宝猪',
    '江米酿鸭子', '罐儿野鸡', '罐儿鹌鹑', '卤什件儿', '卤子鹅', '山鸡', '兔脯', '菜蟒',
    '银鱼', '清蒸哈什蚂', '烩鸭丝', '烩鸭腰', '烩鸭条', '清拌鸭丝', '黄心管儿', '焖白鳝',
    '焖黄鳝', '豆豉鲇鱼', '锅烧鲤鱼', '锅烧鲇鱼', '清蒸甲鱼', '抓炒鲤鱼', '抓炒对虾', '软炸里脊',
    '软炸鸡', '什锦套肠儿', '卤煮寒鸦儿', '麻酥油卷儿', '熘鲜蘑', '熘鱼脯', '熘鱼肚', '熘鱼片儿',
    '醋熘肉片儿', '烩三鲜', '烩白蘑', '烩鸽子蛋', '炒银丝', '烩鳗鱼', '炒白虾', '炝青蛤',
    '炒面鱼', '炒竹笋', '芙蓉燕菜', '炒虾仁儿', '烩虾仁儿', '烩腰花儿', '烩海参', '炒蹄筋儿'
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
    let i = 0;

    while (i < text.length) {
        if (/\s/.test(text[i])) {
            i++;
            continue;
        }

        if (text[i] === '=') {
            base64Str += '=';
            i++;
            continue;
        }

        let found = false;
        for (let idx = 0; idx < CHARS.length; idx++) {
            const dish = CHARS[idx];
            if (text.startsWith(dish, i)) {
                base64Str += STANDARD_CHARS[idx];
                i += dish.length;
                found = true;
                break;
            }
        }

        if (!found) {
            throw new Error('解码失败：位置 ' + i + " 处发现无法识别的字符 '" + text[i] + "'，请检查输入。");
        }
    }

    if (!base64Str) {
        throw new Error("解码失败：未找到有效的报菜名编码内容。");
    }

    try {
        return base64ToUtf8(base64Str);
    } catch (e) {
        throw new Error("解码失败：内部Base64解码错误 (" + (e.message || String(e)) + ")");
    }
}
