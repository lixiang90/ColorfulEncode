# Name: RSA 加密
# Description: 非对称加密 (生成密钥、公钥加密、私钥解密)
# Avatar: 🔐

from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
import base64
import json

# Global config placeholder (injected by JS)
SCRIPT_CONFIG = {}

def get_config_schema():
    """
    Define the configuration UI for this script.
    """
    return json.dumps({
        "params": [
            {
                "name": "public_key",
                "label": "公钥 (Public Key) - 用于加密",
                "type": "textarea",
                "placeholder": "-----BEGIN PUBLIC KEY-----..."
            },
            {
                "name": "private_key",
                "label": "私钥 (Private Key) - 用于解密",
                "type": "textarea",
                "placeholder": "-----BEGIN RSA PRIVATE KEY-----..."
            }
        ],
        "actions": [
            {
                "name": "generate_keys",
                "label": "生成新密钥对 (Generate New Keys)",
                "type": "button"
            }
        ]
    })

def generate_keys():
    """
    Generate a new RSA key pair and return them to update the config.
    """
    key = RSA.generate(2048)
    private_key = key.export_key().decode('utf-8')
    public_key = key.publickey().export_key().decode('utf-8')
    return json.dumps({
        "public_key": public_key,
        "private_key": private_key
    })

def encode(text):
    """
    使用配置中的公钥进行加密
    """
    if not text:
        return ''
        
    pub_key_pem = SCRIPT_CONFIG.get('public_key', '').strip()
    if not pub_key_pem:
        raise ValueError("请先在设置中配置公钥 (Public Key)")

    try:
        recipient_key = RSA.import_key(pub_key_pem)
        cipher_rsa = PKCS1_OAEP.new(recipient_key)
        encrypted_msg = cipher_rsa.encrypt(text.encode('utf-8'))
        return base64.b64encode(encrypted_msg).decode('utf-8')
    except ValueError as ve:
         raise ValueError(f"公钥格式错误: {str(ve)}")
    except Exception as e:
         raise ValueError(f"加密错误: {str(e)}")

def decode(text):
    """
    使用配置中的私钥进行解密
    """
    if not text:
        return ''
        
    priv_key_pem = SCRIPT_CONFIG.get('private_key', '').strip()
    if not priv_key_pem:
        raise ValueError("请先在设置中配置私钥 (Private Key)")
        
    try:
        private_key = RSA.import_key(priv_key_pem)
        cipher_rsa = PKCS1_OAEP.new(private_key)
        
        # Decode base64 first
        try:
            ciphertext = base64.b64decode(text)
        except:
             raise ValueError("输入不是有效的Base64编码")
             
        decrypted_msg = cipher_rsa.decrypt(ciphertext)
        return decrypted_msg.decode('utf-8')
    except ValueError as ve:
         raise ValueError(f"密钥或密文错误: {str(ve)}")
    except Exception as e:
        raise ValueError(f"解密错误: {str(e)} (请检查私钥是否匹配)")