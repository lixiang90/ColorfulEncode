# Name: AES 加密
# Description: 对称加密，使用密码保护消息
# Avatar: 🔐

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Hash import SHA256
from Crypto.Random import get_random_bytes
import base64
import json

# Global config placeholder (injected by JS)
SCRIPT_CONFIG = {}

def get_config_schema():
    return json.dumps({
        "params": [
            {
                "name": "password",
                "label": "密码 (Password)",
                "type": "password",
                "placeholder": "请输入加密密码..."
            }
        ]
    })

def get_key(password):
    h = SHA256.new()
    h.update(password.encode('utf-8'))
    return h.digest()

def encode(text):
    if not text:
        return ''
        
    password = SCRIPT_CONFIG.get('password', '').strip()
    if not password:
        raise ValueError("请先在设置中配置【密码】才能进行加密")
        
    try:
        key = get_key(password)
        iv = get_random_bytes(AES.block_size)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        padded_data = pad(text.encode('utf-8'), AES.block_size)
        encrypted = cipher.encrypt(padded_data)
        # Combine IV and ciphertext, then base64 encode
        return base64.b64encode(iv + encrypted).decode('utf-8')
    except Exception as e:
         raise ValueError(f"加密错误: {str(e)}")

def decode(text):
    if not text:
        return ''
        
    password = SCRIPT_CONFIG.get('password', '').strip()
    if not password:
        raise ValueError("请先在设置中配置【密码】才能进行解密")
        
    try:
        # Decode base64
        try:
            data = base64.b64decode(text)
        except:
             raise ValueError("输入不是有效的Base64编码")
             
        if len(data) < AES.block_size:
            raise ValueError("数据长度错误，可能已损坏")
            
        iv = data[:AES.block_size]
        ciphertext = data[AES.block_size:]
        
        key = get_key(password)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted_padded = cipher.decrypt(ciphertext)
        decrypted = unpad(decrypted_padded, AES.block_size)
        return decrypted.decode('utf-8')
    except ValueError as ve:
         # Padding error or wrong password usually raises ValueError in unpad
         if "Padding" in str(ve) or "PKCS#7" in str(ve):
             raise ValueError("解密失败: 密码错误")
         raise ValueError(f"解密错误: {str(ve)}")
    except Exception as e:
        raise ValueError(f"解密错误: {str(e)}")
