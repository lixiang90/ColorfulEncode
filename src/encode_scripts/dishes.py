# Name: 报菜名
# Description: 相声《报菜名》中的经典菜名
# Avatar: 🍽️

import base64

# Custom character set
CHARS = [
    '蒸羊羔', '蒸熊掌', '蒸鹿尾儿', '烧花鸭', '烧雏鸡', '烧子鹅', '卤猪', '卤鸭',
    '酱鸡', '腊肉', '松花小肚儿', '晾肉', '香肠儿', '什锦苏盘儿', '熏鸡白肚儿', '清蒸八宝猪',
    '江米酿鸭子', '罐儿野鸡', '罐儿鹌鹑', '卤什件儿', '卤子鹅', '山鸡', '兔脯', '菜蟒',
    '银鱼', '清蒸哈什蚂', '烩鸭丝', '烩鸭腰', '烩鸭条', '清拌鸭丝', '黄心管儿', '焖白鳝',
    '焖黄鳝', '豆豉鲇鱼', '锅烧鲤鱼', '锅烧鲇鱼', '清蒸甲鱼', '抓炒鲤鱼', '抓炒对虾', '软炸里脊',
    '软炸鸡', '什锦套肠儿', '卤煮寒鸦儿', '麻酥油卷儿', '熘鲜蘑', '熘鱼脯', '熘鱼肚', '熘鱼片儿',
    '醋熘肉片儿', '烩三鲜', '烩白蘑', '烩鸽子蛋', '炒银丝', '烩鳗鱼', '炒白虾', '炝青蛤',
    '炒面鱼', '炒竹笋', '芙蓉燕菜', '炒虾仁儿', '烩虾仁儿', '烩腰花儿', '烩海参', '炒蹄筋儿'
]

SEPARATOR = '|'

def encode(text):
    if not text:
        return ''
    
    # Standard Base64 encode
    base64_bytes = base64.b64encode(text.encode('utf-8'))
    base64_str = base64_bytes.decode('utf-8')
    
    # Map to custom characters
    standard_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    result = ''
    
    for char in base64_str:
        index = standard_chars.find(char)
        if index != -1:
            result += CHARS[index % len(CHARS)]
        else:
            result += char # Keep padding '='
            
    return result

def decode(text):
    if not text:
        return ''
        
    standard_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    base64_str = ''
    
    i = 0
    while i < len(text):
        # Ignore whitespace
        if text[i].isspace():
            i += 1
            continue

        if text[i] == '=':
            base64_str += '='
            i += 1
            continue
            
        found = False
        # Greedy match: try to find the longest matching dish starting at i
        # Sort CHARS by length descending to ensure we match the longest possible dish first
        # (Though if there's no ambiguity, any match works. But sorting is safer)
        # Note: In Python, it's efficient enough for 64 items.
        
        # Optimization: Just iterate through CHARS and check startswith
        # Since user said "no ambiguity", we assume no dish is a prefix of another
        for idx, dish in enumerate(CHARS):
            if text.startswith(dish, i):
                base64_str += standard_chars[idx]
                i += len(dish)
                found = True
                break
        
        if not found:
            # If we can't match a dish and it's not whitespace/padding, it's an invalid char
            raise ValueError(f"解码失败：位置 {i} 处发现无法识别的字符 '{text[i]}'，请检查输入。")
            
    if not base64_str:
         raise ValueError("解码失败：未找到有效的报菜名编码内容。")

    try:
        return base64.b64decode(base64_str.encode('utf-8'), validate=True).decode('utf-8')
    except Exception as e:
        raise ValueError(f"解码失败：内部Base64解码错误 ({str(e)})")
