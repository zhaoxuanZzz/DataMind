"""缓存工具"""
import hashlib
import json
from typing import Any, Optional
from functools import wraps

from cachetools import TTLCache

from app.core.config import get_settings


# 全局缓存实例
_cache: Optional[TTLCache] = None


def get_cache() -> TTLCache:
    """获取缓存实例（单例）"""
    global _cache
    if _cache is None:
        settings = get_settings()
        _cache = TTLCache(maxsize=1000, ttl=settings.cache_ttl)
    return _cache


def cache_key(*args, **kwargs) -> str:
    """生成缓存键"""
    key_str = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()


def cached(func):
    """缓存装饰器"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not get_settings().enable_query_cache:
            return func(*args, **kwargs)
        
        key = f"{func.__name__}:{cache_key(*args, **kwargs)}"
        cache = get_cache()
        
        if key in cache:
            return cache[key]
        
        result = func(*args, **kwargs)
        cache[key] = result
        return result
    
    return wrapper
