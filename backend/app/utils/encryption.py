"""加密工具"""
import base64
from typing import Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import get_settings


class EncryptionManager:
    """加密管理器"""
    
    def __init__(self, key: Optional[bytes] = None):
        """初始化加密管理器"""
        settings = get_settings()
        if key is None:
            # 从配置或环境变量获取密钥，这里简化处理
            # 生产环境应该使用 KMS 或 Secrets Manager
            key_str = settings.secret_key.encode()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'datamind_salt_2024',  # 生产环境应使用随机salt
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(key_str))
        self.cipher = Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        """加密文本"""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """解密文本"""
        return self.cipher.decrypt(ciphertext.encode()).decode()


# 全局加密管理器实例
_encryption_manager: Optional[EncryptionManager] = None


def get_encryption_manager() -> EncryptionManager:
    """获取加密管理器实例（单例）"""
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager
