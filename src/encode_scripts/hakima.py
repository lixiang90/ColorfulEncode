# Name: 哈基码
# Description: 网络流行的哈基米编码字符集
# Avatar: 🤖

import base64

# Custom character set
CHARS = [
    '哈', '基', '米', '南', '北', '绿', '豆', '阿', '西', '噶', '压', '库', '那', '鲁', '曼', '波',
    '欧', '马', '自', '立', '悠', '嗒', '步', '诺', '斯', '哇', '嗷', '冰', '踩', '背', '叮', '咚',
    '鸡', '大', '狗', '叫', '袋', '鼠', '兴', '奋', '剂', '出', '示', '健', '康', '码', '楼', '上',
    '下', '来', '带', '一', '段', '小', '白', '手', '套', '胖', '宝', '牛', '魔', '呵', '嘿', '喔'
]

# Simple mapping logic (assuming no ambiguity for simplicity, or use separator if needed)
# Since single characters are used, we might not strictly need a separator if chars are unique
# But to be safe and consistent with "dishes", we can check ambiguity or just use direct mapping if single chars.
# In original code: smartSeparator logic. Here: chars are single characters?
# Checking the list: all seem to be single Chinese characters.
# So we can just join them directly without separator, unlike dishes which has multi-char strings.

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
    
    for i, char in enumerate(text):
        if char.isspace():
            continue

        if char == '=':
            base64_str += '='
            continue
            
        try:
            index = CHARS.index(char)
            base64_str += standard_chars[index]
        except ValueError:
             # If char is not in CHARS and not space/equal, it's invalid
            raise ValueError(f"解码失败：位置 {i} 处发现无法识别的字符 '{char}'，请检查输入。")
            
    if not base64_str:
        raise ValueError("解码失败：未找到有效的哈基码编码内容。")

    try:
        return base64.b64decode(base64_str.encode('utf-8'), validate=True).decode('utf-8')
    except Exception as e:
        raise ValueError(f"解码失败：内部Base64解码错误 ({str(e)})")
