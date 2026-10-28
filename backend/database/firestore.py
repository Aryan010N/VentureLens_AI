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

    import glob
    import json

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST")

    # Auto-detect local service account JSON if present in root or backend
    cred_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_file or not os.path.exists(cred_file):
        candidates = (
            glob.glob("*.json") +
            glob.glob("backend/*.json") +
            glob.glob("../*.json")
        )
        for c in candidates:
            if "adminsdk" in c.lower() or "firebase" in c.lower() and not c.endswith("firebase.json"):
                cred_file = c
                break

    # If cred_file found, extract project_id, client_email, private_key
    if cred_file and os.path.exists(cred_file):
        try:
            with open(cred_file, "r") as f:
                cdata = json.load(f)
                if cdata.get("type") == "service_account":
                    project_id = project_id or cdata.get("project_id")
                    client_email = client_email or cdata.get("client_email")
                    private_key = private_key or cdata.get("private_key")
                    logger.info(f"Detected Firebase service account file: {cred_file} (Project: {project_id})")
        except Exception as e:
            logger.warning(f"Error reading credential file {cred_file}: {e}")

    if private_key:
        # Normalize escaped newlines in environment variable
        private_key = private_key.replace("\\n", "\n")

    if emulator_host or (cred_file and os.path.exists(cred_file)) or (project_id and client_email and private_key):
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                if emulator_host:
                    logger.info(f"Connecting to Firestore Emulator at {emulator_host}")
                    _firebase_app = firebase_admin.initialize_app(
                        options={"projectId": project_id or "venturelens-ai-demo"}
                    )
                elif cred_file and os.path.exists(cred_file):
                    logger.info(f"Initializing Firebase Admin with certificate: {cred_file}")
                    cred = credentials.Certificate(cred_file)
                    _firebase_app = firebase_admin.initialize_app(cred)
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

            client = firestore.client()
            
            # Verify live connectivity
            try:
                # Attempt to query collections to ensure Firestore API is enabled
                list(client.collections())
                _db = client
                _is_fallback = False
                logger.info("Successfully connected to live Firebase Firestore.")
                return _db
            except Exception as conn_err:
                err_str = str(conn_err)
                if "Cloud Firestore API has not been used" in err_str or "SERVICE_DISABLED" in err_str:
                    logger.warning(
                        "\n" + "="*80 + "\n"
                        f"[FIREBASE ACTION REQUIRED] Cloud Firestore API is disabled for project '{project_id}'.\n"
                        f"Please enable Firestore Database by visiting:\n"
                        f"https://console.firebase.google.com/project/{project_id}/firestore\n"
                        f"OR\n"
                        f"https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project={project_id}\n"
                        "Click 'Create Database' / 'Enable' in the Firebase Console.\n"
                        "Operating in local in-memory fallback mode until Firestore is enabled.\n"
                        + "="*80 + "\n"
                    )
                else:
                    logger.warning(f"Firestore connectivity check failed ({conn_err}). Engaging in-memory fallback.")
        except Exception as e:
            logger.warning(f"Failed to connect to Firebase Admin SDK ({e}). Enabling local in-memory fallback store.")

    # Graceful In-Memory Firestore Emulator Fallback
    logger.info("Operating in Local In-Memory Firestore Mode.")
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

    def delete(self):
        if self.path in self.store:
            del self.store[self.path]
        return True


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

def delete_project(company_id: str, project_id: str) -> bool:
    db = get_firestore_client()
    db.collection("companies").document(company_id).collection("projects").document(project_id).delete()
    return True

def clear_projects(company_id: str) -> bool:
    db = get_firestore_client()
    docs = db.collection("companies").document(company_id).collection("projects").stream()
    for d in docs:
        d.reference.delete()
    return True

def save_user(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    db = get_firestore_client()
    if "created_at" not in data or not data["created_at"]:
        data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["user_id"] = user_id
    db.collection("users").document(user_id).set(data)
    return data

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    doc = db.collection("users").document(user_id).get()
    if doc.exists:
        data = doc.to_dict()
        data["user_id"] = user_id
        return data
    return None

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    clean_email = email.strip().lower()
    docs = db.collection("users").stream()
    for d in docs:
        u = d.to_dict()
        if u.get("email", "").strip().lower() == clean_email:
            u["user_id"] = d.id
            return u
    return None

