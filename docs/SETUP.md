# Setup

## Local demonstration

The reviewer UI contains a deterministic synthetic assessment and runs without an API key.

```powershell
cd apps/web
npm install
npm run dev
```

## API development

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload
```

## Docker stack

1. Copy `.env.example` to `.env`.
2. Replace the object-storage secret.
3. Add a model API key only when enabling a live provider.
4. Run `docker compose up --build`.
5. Open the web interface and API documentation.

Do not use real vendor documents until authentication, authorization, encryption, retention, malware scanning, and organization-specific privacy controls are configured.

