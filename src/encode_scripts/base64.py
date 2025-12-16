# Name: Standard Base64
# Description: Standard Base64 encoding using Python
# Avatar: 🐍

import base64
import binascii

def encode(text):
    # Encode string to bytes, then base64 encode, then back to string
    return base64.b64encode(text.encode('utf-8')).decode('utf-8')

def decode(text):
    # Decode base64 string to bytes, then to string
    try:
        return base64.b64decode(text, validate=True).decode('utf-8')
    except (binascii.Error, ValueError, UnicodeDecodeError) as e:
        raise ValueError("解码失败：输入包含无效字符或格式错误")
