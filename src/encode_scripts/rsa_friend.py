# Name: RSA (Friend)
# Description: 与朋友安全通信 (使用朋友公钥加密，自己私钥解密)
# Avatar: 🤝

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
                "name": "friend_public_key",
                "label": "朋友的公钥 (Friend's Public Key) - 用于发送加密消息",
                "type": "textarea",
                "placeholder": "-----BEGIN PUBLIC KEY-----..."
            },
            {
                "name": "my_public_key",
                "label": "我的公钥 (My Public Key) - 发送给朋友",
                "type": "textarea",
                "placeholder": "生成后自动填充，请发送给朋友...",
                "readOnly": True
            },
            {
                "name": "my_private_key",
                "label": "我的私钥 (My Private Key) - 用于解密收到的消息",
                "type": "textarea",
                "placeholder": "生成后自动填充，请勿泄露...",
                "readOnly": True
            }
        ],
        "actions": [
            {
                "name": "generate_keys",
                "label": "生成我的密钥对 (Generate My Keys)",
                "type": "button"
            }
        ]
    })

def generate_keys():
    """
    Generate a new RSA key pair for the user.
    """
    key = RSA.generate(2048)
    private_key = key.export_key().decode('utf-8')
    public_key = key.publickey().export_key().decode('utf-8')
    return json.dumps({
        "my_public_key": public_key,
        "my_private_key": private_key
    })

def encode(text):
    """
    加密函数：使用【朋友的公钥】加密消息，发送给朋友
    """
    if not text:
        return ''
        
    friend_pub_key = SCRIPT_CONFIG.get('friend_public_key', '').strip()
    if not friend_pub_key:
        raise ValueError("请先在设置中配置【朋友的公钥】才能发送加密消息")

    try:
        recipient_key = RSA.import_key(friend_pub_key)
        cipher_rsa = PKCS1_OAEP.new(recipient_key)
        encrypted_msg = cipher_rsa.encrypt(text.encode('utf-8'))
        return base64.b64encode(encrypted_msg).decode('utf-8')
    except ValueError as ve:
         raise ValueError(f"朋友公钥格式错误: {str(ve)}")
    except Exception as e:
         raise ValueError(f"加密错误: {str(e)}")

def decode(text):
    """
    解密函数：使用【我的私钥】解密朋友发来的消息
    """
    if not text:
        return ''
        
    my_priv_key = SCRIPT_CONFIG.get('my_private_key', '').strip()
    if not my_priv_key:
        raise ValueError("请先生成【我的密钥对】才能解密消息")
        
    try:
        private_key = RSA.import_key(my_priv_key)
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
        raise ValueError(f"解密错误: {str(e)} (请确认这是发给您的消息)")