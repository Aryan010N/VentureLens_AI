import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("venturelens.firestore")
logging.basicConfig(level=logging.INFO)

# Global clients
_firebase_app = None
_db = None
_is_fallback = False

def get_firestore_client():
    """
    Returns the Firestore client.
    First checks for standard Firebase credentials or FIRESTORE_EMULATOR_HOST.
    If none are configured, falls back to an in-memory document store to allow
    frictionless local testing and CI verification without requiring immediate cloud credentials.
    """
    global _firebase_app, _db, _is_fallback

    if _db is not None:
        return _db

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST")

    if private_key:
        # Normalize escaped newlines in environment variable
        private_key = private_key.replace("\\n", "\n")

    if emulator_host or (project_id and client_email and private_key):
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                if emulator_host:
                    logger.info(f"Connecting to Firestore Emulator at {emulator_host}")
                    _firebase_app = firebase_admin.initialize_app(
                        options={"projectId": project_id or "venturelens-ai-demo"}
                    )
                else:
                    logger.info(f"Initializing Firebase Admin with project: {project_id}")
                    cred = credentials.Certificate({
                        "type": "service_account",
                        "project_id": project_id,
                        "private_key": private_key,
                        "client_email": client_email,
                        "token_uri": "https://oauth2.googleapis.com/token",
                    })
                    _firebase_app = firebase_admin.initialize_app(cred)

            _db = firestore.client()
            _is_fallback = False
            logger.info("Successfully connected to live Firebase Firestore.")
            return _db
        except Exception as e:
            logger.warning(f"Failed to connect to Firebase Admin SDK ({e}). Enabling local in-memory fallback store.")

    # Graceful In-Memory Firestore Emulator Fallback
    logger.info("Operating in Local In-Memory Firestore Mode (No cloud credentials provided).")
    _is_fallback = True
    _db = InMemoryFirestore()
    return _db


class InMemoryDocumentSnapshot:
    def __init__(self, doc_id: str, data: Optional[Dict[str, Any]]):
        self.id = doc_id
        self._data = data
        self.exists = data is not None

    def to_dict(self) -> Optional[Dict[str, Any]]:
        return dict(self._data) if self._data is not None else None


class InMemoryDocumentRef:
    def __init__(self, store: Dict[str, Any], path: str, doc_id: str):
        self.store = store
        self.path = path
        self.id = doc_id

    def set(self, data: Dict[str, Any], merge: bool = False):
        if merge and self.path in self.store:
            self.store[self.path].update(data)
        else:
            self.store[self.path] = dict(data)
        return True

    def get(self) -> InMemoryDocumentSnapshot:
        data = self.store.get(self.path)
        return InMemoryDocumentSnapshot(self.id, data)

    def collection(self, subcoll_name: str) -> "InMemoryCollectionRef":
        return InMemoryCollectionRef(self.store, f"{self.path}/{subcoll_name}")

    def update(self, data: Dict[str, Any]):
        if self.path in self.store:
            self.store[self.path].update(data)
        else:
            self.store[self.path] = dict(data)


class InMemoryCollectionRef:
    def __init__(self, store: Dict[str, Any], path: str):
        self.store = store
        self.path = path

    def document(self, doc_id: Optional[str] = None) -> InMemoryDocumentRef:
        if not doc_id:
            import uuid
            doc_id = str(uuid.uuid4())
        doc_path = f"{self.path}/{doc_id}"
        return InMemoryDocumentRef(self.store, doc_path, doc_id)

    def stream(self):
        prefix = f"{self.path}/"
        results = []
        seen_ids = set()
        for key in list(self.store.keys()):
            if key.startswith(prefix):
                remainder = key[len(prefix):]
                if "/" not in remainder:  # Direct child
                    doc_id = remainder
                    if doc_id not in seen_ids:
                        seen_ids.add(doc_id)
                        results.append(InMemoryDocumentSnapshot(doc_id, self.store[key]))
        return results


class InMemoryFirestore:
    def __init__(self):
        self._store: Dict[str, Any] = {}

    def collection(self, collection_name: str) -> InMemoryCollectionRef:
        return InMemoryCollectionRef(self._store, collection_name)

    def document(self, path: str) -> InMemoryDocumentRef:
        parts = path.split("/")
        doc_id = parts[-1]
        return InMemoryDocumentRef(self._store, path, doc_id)


# High-level helper methods for VentureLens AI entities
def save_company(company_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    db = get_firestore_client()
    if "created_at" not in data or not data["created_at"]:
        data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["company_id"] = company_id
    db.collection("companies").document(company_id).set(data)
    return data

def get_company(company_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    doc = db.collection("companies").document(company_id).get()
    if doc.exists:
        data = doc.to_dict()
        data["company_id"] = company_id
        return data
    return None

def save_project(company_id: str, project_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    db = get_firestore_client()
    if "created_at" not in data or not data["created_at"]:
        data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["project_id"] = project_id
    data["company_id"] = company_id
    db.collection("companies").document(company_id).collection("projects").document(project_id).set(data)
    return data

def get_projects(company_id: str) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    docs = db.collection("companies").document(company_id).collection("projects").stream()
    projects = []
    for d in docs:
        p = d.to_dict()
        p["project_id"] = d.id
        projects.append(p)
    return projects

def save_run(company_id: str, run_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    db = get_firestore_client()
    if "timestamp" not in data or not data["timestamp"]:
        data["timestamp"] = datetime.now(timezone.utc).isoformat()
    data["run_id"] = run_id
    data["company_id"] = company_id
    db.collection("companies").document(company_id).collection("runs").document(run_id).set(data)
    return data

def get_runs(company_id: str) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    docs = db.collection("companies").document(company_id).collection("runs").stream()
    runs = []
    for d in docs:
        r = d.to_dict()
        r["run_id"] = d.id
        runs.append(r)
    # Sort by timestamp descending
    runs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return runs
