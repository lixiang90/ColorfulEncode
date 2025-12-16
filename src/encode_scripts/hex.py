# Name: Hex String
# Description: Convert text to Hex representation
# Avatar: 🔢

def encode(text):
    return text.encode('utf-8').hex()

def decode(text):
    try:
        return bytes.fromhex(text).decode('utf-8')
    except (ValueError, UnicodeDecodeError) as e:
        raise ValueError("解码失败：无效的十六进制字符串")
