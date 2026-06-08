import os
import hmac
import hashlib
import uuid
import json
import logging
import redis.asyncio as aioredis
from dotenv import load_dotenv

# Nạp biến môi trường
load_dotenv()

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ama_redis_service")
# Đặt chế độ DEBUG để hiển thị log chi tiết
logger.setLevel(logging.DEBUG)

SECRET_KEY = os.getenv("SECRET_KEY", "ama_secret_session_signing_key_2026")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
REDIS_TTL = int(os.getenv("REDIS_TTL", "600"))

def generate_signed_session_id() -> str:
    """Tạo mới một Session ID ngẫu nhiên và ký bằng HMAC-SHA256"""
    session_uuid = str(uuid.uuid4())
    signature = hmac.new(SECRET_KEY.encode("utf-8"), session_uuid.encode("utf-8"), hashlib.sha256).hexdigest()
    signed_id = f"{session_uuid}.{signature}"
    logger.debug(f"Generated new signed session ID: {signed_id}")
    return signed_id

def verify_session_id(signed_id: str) -> str | None:
    """
    Xác minh chữ ký của Session ID.
    Trả về raw session_uuid nếu chữ ký hợp lệ, ngược lại trả về None.
    """
    if not signed_id or "." not in signed_id:
        logger.debug("Signed session ID missing or invalid format")
        return None
    try:
        session_uuid, signature = signed_id.split(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), session_uuid.encode("utf-8"), hashlib.sha256).hexdigest()
        if hmac.compare_digest(signature, expected_sig):
            logger.debug(f"Session ID signature verified successfully: {session_uuid}")
            return session_uuid
        else:
            logger.warning("Session ID signature mismatch/tampered!")
    except Exception as e:
        logger.error(f"Error verifying session ID: {e}")
    return None

class RedisService:
    def __init__(self, url: str, ttl: int):
        self.url = url
        self.ttl = ttl
        self.client = None
        self.is_connected = False

    async def connect(self):
        """Khởi tạo kết nối bất đồng bộ tới Redis với cơ chế Timeout và Ping"""
        if self.client is None or not self.is_connected:
            try:
                logger.debug(f"Attempting to connect to Redis at {self.url}...")
                self.client = aioredis.from_url(
                    self.url,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0
                )
                await self.client.ping()
                self.is_connected = True
                logger.info("Connected to Redis server successfully.")
            except Exception as e:
                self.is_connected = False
                self.client = None
                logger.warning(f"WARNING: Failed to connect to Redis: {e}. System will run in STATELESS mode.")

    async def get_client(self):
        """Lấy client Redis đã kết nối, nếu lỗi trả về None"""
        await self.connect()
        if self.is_connected:
            return self.client
        return None

    async def get_history(self, session_uuid: str) -> list:
        """
        Lấy lịch sử hội thoại từ Redis (giải tuần tự hóa từ JSON).
        Nếu Redis offline, tự động chuyển sang chế độ stateless (trả về danh sách rỗng).
        """
        logger.debug(f"Reading history from Redis for session: {session_uuid}")
        client = await self.get_client()
        if not client:
            logger.warning(f"Redis is offline. Fallback to stateless mode. Returning empty history.")
            return []

        try:
            key = f"session:{session_uuid}:history"
            raw_messages = await client.lrange(key, 0, -1)
            history = []
            for msg_str in raw_messages:
                try:
                    history.append(json.loads(msg_str))
                except Exception as e:
                    logger.error(f"Error parsing message JSON from Redis: {e}")
            logger.debug(f"Successfully retrieved {len(history)} messages from Redis for session: {session_uuid}")
            return history
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning(f"Error accessing Redis while getting history: {e}. Resetting client. Fallback to stateless mode.")
            return []

    async def save_message(self, session_uuid: str, role: str, content: str):
        """
        Lưu tin nhắn mới vào Redis dưới dạng JSON, duy trì tối đa 10 tin nhắn (5 lượt),
        và cập nhật thời gian sống (TTL).
        """
        logger.debug(f"Saving {role} message to Redis for session: {session_uuid}")
        client = await self.get_client()
        if not client:
            logger.warning(f"Redis is offline. Skipping message storage.")
            return

        try:
            key = f"session:{session_uuid}:history"
            message_data = json.dumps({"role": role, "content": content}, ensure_ascii=False)
            
            async with client.pipeline(transaction=True) as pipe:
                pipe.rpush(key, message_data)
                # Cắt tỉa giữ lại 10 phần tử cuối cùng (tương đương 5 lượt tin nhắn)
                pipe.ltrim(key, -10, -1)
                pipe.expire(key, self.ttl)
                await pipe.execute()
            logger.debug(f"Message stored and database list trimmed for session: {session_uuid}. TTL updated to {self.ttl}s.")
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning(f"Error accessing Redis while saving message: {e}. Resetting client. Fallback to stateless mode.")

    async def clear_session(self, session_uuid: str):
        """Xóa lịch sử hội thoại của Session ID tương ứng"""
        logger.debug(f"Clearing history in Redis for session: {session_uuid}")
        client = await self.get_client()
        if not client:
            logger.warning(f"Redis is offline. Cannot clear session.")
            return

        try:
            key = f"session:{session_uuid}:history"
            await client.delete(key)
            logger.debug(f"Deleted key '{key}' from Redis.")
        except Exception as e:
            self.is_connected = False
            self.client = None
            logger.warning(f"Error accessing Redis while deleting session: {e}. Resetting client.")

redis_service = RedisService(url=REDIS_URL, ttl=REDIS_TTL)
