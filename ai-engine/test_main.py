"""
test_main.py — Ghost Test Scaffold (Pytest + HTTPX)

Validates basic FastAPI endpoint responses using the TestClient.
No real Gemini API calls are made; tests hit the fallback path.

Install dependencies before running:
    pip install pytest httpx

Run with:  pytest test_main.py -v
"""

import math
import pytest
from fastapi.testclient import TestClient

# Temporarily clear the API key so the app boots into fallback mode
import os
os.environ.pop("GEMINI_API_KEY", None)

from main import app


client = TestClient(app)


class TestHealthEndpoint:
    """Verify the health check returns a valid status."""

    def test_health_returns_200(self):
        response = client.get("/")
        assert response.status_code == 200

    def test_health_contains_status_key(self):
        response = client.get("/")
        data = response.json()
        assert "status" in data
        assert "RECALL AI Engine" in data["status"]


class TestGenerateQuestions:
    """Verify /generate-questions returns valid fallback JSON."""

    def test_returns_200(self):
        response = client.post(
            "/generate-questions",
            json={"topic_name": "Python", "count": 3},
        )
        assert response.status_code == 200

    def test_response_has_topic_and_questions(self):
        response = client.post(
            "/generate-questions",
            json={"topic_name": "Python", "count": 3},
        )
        data = response.json()
        assert data["topic"] == "Python"
        assert isinstance(data["questions"], list)
        assert len(data["questions"]) == 3

    def test_question_schema(self):
        response = client.post(
            "/generate-questions",
            json={"topic_name": "Python", "count": 1},
        )
        q = response.json()["questions"][0]
        assert "question" in q
        assert "options" in q
        assert "correctAnswer" in q
        assert len(q["options"]) == 4
        assert q["correctAnswer"] in q["options"]


class TestCalculateRetention:
    """Verify the Ebbinghaus retention math is correct."""

    def test_full_retention_at_time_zero(self):
        response = client.post(
            "/calculate-retention",
            json={"half_life": 24.0, "hours_passed": 0},
        )
        data = response.json()
        assert data["retention_percentage"] == 100.0

    def test_half_retention_at_half_life(self):
        response = client.post(
            "/calculate-retention",
            json={"half_life": 24.0, "hours_passed": 24.0},
        )
        data = response.json()
        assert data["retention_percentage"] == 50.0

    def test_quarter_retention_at_two_half_lives(self):
        response = client.post(
            "/calculate-retention",
            json={"half_life": 24.0, "hours_passed": 48.0},
        )
        data = response.json()
        assert data["retention_percentage"] == 25.0


class TestUpdateHalfLife:
    """Verify the HLR multiplier logic returns sane values."""

    def test_high_score_increases_half_life(self):
        response = client.post(
            "/update-half-life",
            json={"score": 5.0, "current_half_life": 24.0},
        )
        data = response.json()
        assert data["new_half_life"] > 24.0

    def test_low_score_decreases_half_life(self):
        response = client.post(
            "/update-half-life",
            json={"score": 0.5, "current_half_life": 24.0},
        )
        data = response.json()
        assert data["new_half_life"] < 24.0

    def test_half_life_never_below_one(self):
        response = client.post(
            "/update-half-life",
            json={"score": 0.0, "current_half_life": 1.0},
        )
        data = response.json()
        assert data["new_half_life"] >= 1.0


class TestCalculateProjection:
    """Verify the projection endpoint returns valid day-by-day data."""

    def test_returns_correct_number_of_days(self):
        response = client.post(
            "/calculate-projection",
            json={"half_life": 24.0, "days": 7},
        )
        data = response.json()
        assert len(data["projection"]) == 8  # day 0 through day 7

    def test_day_zero_is_full_retention(self):
        response = client.post(
            "/calculate-projection",
            json={"half_life": 24.0, "m": 100.0, "days": 3},
        )
        data = response.json()
        assert data["projection"][0]["retention"] == 100.0
