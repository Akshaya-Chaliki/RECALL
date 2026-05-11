import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("recall_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──
export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const getMe = () => API.get("/auth/me");

// ── Skills ──
export const getSkills = () => API.get("/skills");
export const createSkill = (data) => API.post("/skills", data);
export const deleteSkill = (id) => API.delete(`/skills/${id}`);

// ── Topics ──
export const getTopics = (skillId) => API.get(`/topics?skillId=${skillId}`);
export const getAllTopics = () => API.get("/topics");
export const createTopic = (data) => API.post("/topics", data);
export const deleteTopic = (id) => API.delete(`/topics/${id}`);

// ── Quiz ──
export const generateEntryTest = (topicName) => API.post("/quiz/entry-test", { topicName });
export const submitEntryTest = (data) => API.post("/quiz/entry-test/submit", data);
export const generateQuiz = (topicId) => API.get(`/quiz/${topicId}/questions`);
export const submitQuiz = (topicId, data) => API.post(`/quiz/${topicId}/results`, data);
export const getFlashcards = (topicId) => API.get(`/quiz/${topicId}/flashcards`);

// ── Dashboard ──
export const getTopicRetention = (topicId) => API.get(`/dashboard/${topicId}/retention`);
export const getDashboardData = (topicId) => API.get(`/dashboard/${topicId}/retention`);

// ── Health ──
export const checkHealth = () => API.get("/health");
export const checkAIHealth = () => API.get("/health/ai-engine");

export default API;
