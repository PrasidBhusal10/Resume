# ── ResumeAI Dev Commands ─────────────────────────────────────────────────────

.PHONY: up down dev-ai dev-frontend logs db-shell clean

up:
	cp -n .env.example .env || true
	docker-compose up --build -d
	@echo "✓ All services up:"
	@echo "  Frontend  → http://localhost:3000"
	@echo "  Backend   → http://localhost:8080"
	@echo "  AI        → http://localhost:8001"

down:
	docker-compose down

# Run AI service locally for fast iteration (requires ANTHROPIC_API_KEY in .env)
dev-ai:
	cd ai-service && pip install -r requirements.txt && \
	CHROMA_HOST=localhost CHROMA_PORT=8000 uvicorn main:app --reload --port 8001

# Run Next.js frontend in dev mode
dev-frontend:
	cd frontend && npm install && npm run dev

logs:
	docker-compose logs -f

db-shell:
	docker-compose exec mysql mysql -u resumeuser -presumepass resume_optimizer

clean:
	docker-compose down -v --remove-orphans
	find . -name "*.o" -delete
	find . -name "*.a" -delete
