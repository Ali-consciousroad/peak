-- Drop unused chatbots table (AI widget uses /api/chatbot only; no DB persistence)
DROP TABLE IF EXISTS "chatbots";
