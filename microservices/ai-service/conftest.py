import pytest
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.fixture(autouse=True)
def mock_groq_api():
    """Automatically mock all Groq API calls for all tests to prevent accidental network requests."""
    with patch("llm_client.AsyncGroq") as MockGroq:
        mock_instance = MockGroq.return_value
        
        # Setup default mock response
        mock_message = MagicMock()
        mock_message.content = '{"score": 85, "feedback": "Good resume."}'
        
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        
        mock_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        
        yield mock_instance
