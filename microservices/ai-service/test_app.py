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
@patch("llm_client.client.chat.completions.create", new_callable=AsyncMock)
async def test_worker_process(mock_create):
    """Test the BullMQ process function with a mocked Groq client."""
    # Mock the API response
    mock_message = MagicMock()
    mock_message.content = '{"score": 85, "feedback": "Good resume."}'
    
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    
    mock_create.return_value = mock_response

    # Mock the BullMQ Job
    mock_job = MagicMock(spec=Job)
    mock_job.id = "test-job-123"
    mock_job.name = "score-ats"
    mock_job.data = {"prompt": "Analyze this resume text..."}

    # Call the process function
    result = await process(mock_job, "test-token")

    # Assertions
    mock_create.assert_called_once()
    assert result == {"score": 85, "feedback": "Good resume."}
