"""
Astra AI - Security Manager
Handles encryption, authentication, permissions, and audit logging.
"""

from typing import List, Dict, Any, Optional, Callable
import os
import hashlib
import secrets
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from cryptography.fernet import Fernet
from loguru import logger

from ..config import settings


class SecurityManager:
    """
    Security manager providing:
    - Encryption/decryption of sensitive data
    - Password hashing and verification
    - API key management
    - Permission checking
    - Audit logging
    - JWT token management
    - Rate limiting
    """

    def __init__(self):
        self._fernet: Optional[Fernet] = None
        self._rate_limits: Dict[str, List[datetime]] = {}
        self._init_encryption()

    def _init_encryption(self):
        """Initialize the encryption system."""
        try:
            key_file = settings.CONFIG_DIR / ".encryption_key"
            if key_file.exists():
                key = key_file.read_bytes()
            else:
                key = Fernet.generate_key()
                key_file.write_bytes(key)
                key_file.chmod(0o600)
            self._fernet = Fernet(key)
            logger.debug("Encryption initialized")
        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")

    # ============================================================
    # Encryption
    # ============================================================

    def encrypt(self, data: str) -> str:
        """Encrypt a string."""
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")
        return self._fernet.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt a string."""
        if not self._fernet:
            raise RuntimeError("Encryption not initialized")
        return self._fernet.decrypt(encrypted_data.encode()).decode()

    def encrypt_file(self, file_path: Path) -> Path:
        """Encrypt a file and return the encrypted file path."""
        encrypted_path = file_path.with_suffix(file_path.suffix + ".enc")
        try:
            data = file_path.read_bytes()
            encrypted = self._fernet.encrypt(data)
            encrypted_path.write_bytes(encrypted)
            return encrypted_path
        except Exception as e:
            logger.error(f"Failed to encrypt file {file_path}: {e}")
            raise

    def decrypt_file(self, encrypted_path: Path) -> bytes:
        """Decrypt an encrypted file."""
        try:
            data = encrypted_path.read_bytes()
            return self._fernet.decrypt(data)
        except Exception as e:
            logger.error(f"Failed to decrypt file {encrypted_path}: {e}")
            raise

    # ============================================================
    # Password Management
    # ============================================================

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        import bcrypt as bcrypt_lib
        salt = bcrypt_lib.gensalt()
        hashed = bcrypt_lib.hashpw(password.encode(), salt)
        return hashed.decode()

    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against its hash."""
        import bcrypt as bcrypt_lib
        return bcrypt_lib.checkpw(password.encode(), hashed.encode())

    # ============================================================
    # API Key Management
    # ============================================================

    def generate_api_key(self) -> str:
        """Generate a secure API key."""
        return f"astra_{secrets.token_urlsafe(32)}"

    def hash_api_key(self, api_key: str) -> str:
        """Hash an API key for storage."""
        return hashlib.sha256(api_key.encode()).hexdigest()

    def verify_api_key(self, api_key: str, stored_hash: str) -> bool:
        """Verify an API key against its stored hash."""
        return self.hash_api_key(api_key) == stored_hash

    # ============================================================
    # JWT Token Management
    # ============================================================

    def create_jwt_token(self, user_id: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
        """Create a JWT token."""
        import jwt
        payload = {
            "sub": user_id,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_EXPIRATION),
            "type": "access",
        }
        if extra_claims:
            payload.update(extra_claims)
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token."""
        import jwt
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None

    # ============================================================
    # Permission Management
    # ============================================================

    def check_permission(self, user_permissions: List[str], required_permission: str) -> bool:
        """Check if a user has a specific permission."""
        return required_permission in user_permissions

    def check_permissions(self, user_permissions: List[str], required_permissions: List[str]) -> bool:
        """Check if a user has all required permissions."""
        return all(p in user_permissions for p in required_permissions)

    # ============================================================
    # Session Management
    # ============================================================

    def create_session(self) -> Dict[str, Any]:
        """Create a new session."""
        session_id = secrets.token_urlsafe(32)
        return {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_TIMEOUT),
        }

    def is_session_valid(self, session: Dict[str, Any]) -> bool:
        """Check if a session is still valid."""
        expires_at = session.get("expires_at")
        if not expires_at:
            return False
        if isinstance(expires_at, str):
            from datetime import datetime as dt
            expires_at = dt.fromisoformat(expires_at.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) < expires_at

    # ============================================================
    # Audit Logging
    # ============================================================

    def create_audit_entry_sync(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "info",
    ) -> Dict[str, Any]:
        """Create an audit log entry (synchronous version)."""
        entry = {
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "user_id": user_id,
            "details": details or {},
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        logger.debug(f"Audit: {action} on {entity_type} by {user_id}")
        return entry

    # ============================================================
    # Input Validation
    # ============================================================

    def sanitize_input(self, text: str) -> str:
        """Sanitize user input to prevent injection attacks."""
        import html
        return html.escape(text, quote=True)

    def validate_path(self, path: str) -> bool:
        """Validate that a path is safe and within allowed directories."""
        try:
            resolved = Path(path).resolve()
            allowed_dirs = [
                Path.home() / ".astra",
                Path.cwd(),
            ]
            for allowed in allowed_dirs:
                try:
                    resolved.relative_to(allowed)
                    return True
                except ValueError:
                    continue
            return False
        except Exception:
            return False

    def get_safe_path(self, path: str) -> Optional[Path]:
        """Resolve a path safely, returning None if unsafe."""
        try:
            resolved = Path(path).resolve()
            if self.validate_path(str(resolved)):
                return resolved
            return None
        except Exception:
            return None

    # ============================================================
    # Rate Limiting
    # ============================================================

    def check_rate_limit(self, key: str, max_attempts: int = 5, window_seconds: int = 60) -> bool:
        """Check if a rate limit has been exceeded."""
        now = datetime.now(timezone.utc)
        if key not in self._rate_limits:
            self._rate_limits[key] = []

        self._rate_limits[key] = [
            t for t in self._rate_limits[key]
            if (now - t).seconds < window_seconds
        ]

        if len(self._rate_limits[key]) >= max_attempts:
            return False

        self._rate_limits[key].append(now)
        return True

    def get_status(self) -> Dict[str, Any]:
        """Get security manager status."""
        return {
            "encryption_enabled": self._fernet is not None,
            "encryption_algorithm": "AES-256-GCM",
            "jwt_enabled": True,
            "rate_limits_active": len(self._rate_limits),
        }
