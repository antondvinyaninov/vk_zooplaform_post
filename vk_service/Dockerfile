FROM python:3.11-slim

WORKDIR /app

# Копируем requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем VK MCP
COPY ../vk_mcp /app/vk_mcp

# Копируем сервис
COPY main.py .

EXPOSE 5000

CMD ["python", "main.py"]
