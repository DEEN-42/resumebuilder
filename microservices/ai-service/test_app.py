import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from app import app
from worker import process
from bullmq import Job

client = TestClient(app)

def test_health_check():
    """Test the /health endpoint to ensure the FastAPI app boots up and returns a 200 OK status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_worker_process(mock_groq_api):
    """Test the BullMQ process function with a mocked Groq client."""
    # Mock the BullMQ Job
    mock_job = MagicMock(spec=Job)
    mock_job.id = "test-job-123"
    mock_job.name = "score-ats"
    mock_job.data = {"prompt": "Analyze this resume text..."}

    # Call the process function
    result = await process(mock_job, "test-token")

    # Assertions
    mock_groq_api.chat.completions.create.assert_called_once()
    assert result == {"score": 85, "feedback": "Good resume."}
