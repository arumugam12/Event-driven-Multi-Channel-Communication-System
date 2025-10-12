# Event-driven Multi-Channel Communication System

An AI-powered communication system that integrates with multiple platforms (Telegram, WhatsApp, Instagram) to provide intelligent, context-aware responses using OpenAI's GPT models.

## 🚀 Features

- **Multi-Platform Support**: Telegram (implemented), WhatsApp & Instagram (extensible)
- **AI-Powered Responses**: OpenAI GPT integration with context awareness
- **Event-Driven Architecture**: Asynchronous message processing with Redis queues
- **Message Logging**: Complete audit trail of all conversations
- **User Context**: Short-term memory for personalized interactions
- **Spam Detection**: Built-in spam filtering
- **Rate Limiting**: Configurable rate limits per user
- **Health Monitoring**: Comprehensive health checks and metrics
- **Docker Support**: Easy deployment with Docker Compose
- **Error Handling**: Robust error handling with retry mechanisms

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram      │    │   WhatsApp      │    │   Instagram     │
│   Bot           │    │   Business API  │    │   Graph API     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Webhook Endpoints     │
                    │   (NestJS Controllers)    │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Message Processing     │
                    │      Queue (Redis)        │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      AI Processing        │
                    │    (OpenAI GPT API)       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     Message Delivery      │
                    │   (Platform APIs)         │
                    └───────────────────────────┘
```

## 📋 Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 6+
- Docker & Docker Compose (optional)
- Telegram Bot Token
- OpenAI API Key

## 🛠️ Installation
<!-- 
### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Event-driven-Multi-Channel-Communication-System
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

3. **Start the services**
   ```bash
   # For development
   docker-compose -f docker-compose.dev.yml up -d
   
   # For production
   docker-compose up -d
   ```
-->
### Option 1: Manual Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL and Redis**
   ```bash
   # Start PostgreSQL and Redis services
   # Update connection details in .env
   ```

3. **Run the application**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
MONGO_URI=mongodb://localhost:27017/communication_system
MONGO_DB=communication_system

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/webhook/telegram

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=150
OPENAI_TEMPERATURE=0.7

# Application
NODE_ENV=development
PORT=3000
```

### Userbot (send/receive as your Telegram user)

Add these if you want to auto-reply from your personal account:

```env
# Telegram Userbot (MTProto)
TG_API_ID=your_api_id
TG_API_HASH=your_api_hash
TG_PHONE=+1234567890
# If you have 2FA password set in Telegram cloud
TG_2FA_PASSWORD=
# Optional: session string for headless login
TG_STRING_SESSION=
```

When enabled, the `UserbotService` logs in to your Telegram user account, listens to incoming DMs, enqueues them through the same queues, and delivers replies back from your account when `platform=userbot`.
<!--
### Telegram Bot Setup

1. **Create a bot with BotFather**
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Follow the instructions to get your bot token

2. **Set webhook**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://yourdomain.com/api/webhook/telegram"}'
   ```
-->

## 📡 API Endpoints

### Health & Monitoring
- `GET /api/health` - Health check
- `GET /api/health/stats` - System statistics

### Telegram
- `POST /api/webhook/telegram` - Telegram webhook
- `GET /api/webhook/telegram/health` - Telegram service health
- `POST /api/webhook/telegram/send/:chatId` - Send message to Telegram

## 🔄 Message Flow

1. **Message Received**: User sends message on platform (e.g., Telegram)
2. **Webhook Processing**: Message received via webhook endpoint
3. **Queue Processing**: Message added to processing queue
4. **AI Generation**: Message sent to OpenAI for response generation
5. **Context Update**: User context and message history updated
6. **Message Delivery**: AI response sent back to user
7. **Logging**: Complete conversation logged to database

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

## 📊 Monitoring

### Health Checks
- Application health: `GET /api/health`
- Queue statistics: `GET /api/health/stats`
- Redis Commander: `http://localhost:8081` (if enabled)
<!-- 
### Logs
```bash
# View application logs
docker-compose logs -f app

# View all logs
docker-compose logs -f
```
-->

## 🚀 Deployment

### Production Deployment

1. **Set up production environment**
   ```bash
   # Update .env with production values
   NODE_ENV=production
   DB_HOST=your_production_db_host
   # ... other production configs
   ```
<!-- 
2. **Deploy with Docker**
   ```bash
   docker-compose up -d
   ```
-->
3. **Set up reverse proxy** (nginx/traefik)
4. **Configure SSL certificates**
5. **Set up monitoring and alerting**

### Scaling

- **Horizontal scaling**: Run multiple app instances behind a load balancer
- **Queue scaling**: Increase Redis memory and add more workers
- **Database scaling**: Use read replicas for analytics queries

## 🔧 Development

### Adding New Platforms

1. **Create platform module**
   ```bash
   # Example: WhatsApp module
   mkdir src/whatsapp
   touch src/whatsapp/whatsapp.module.ts
   touch src/whatsapp/whatsapp.controller.ts
   touch src/whatsapp/whatsapp.service.ts
   ```

2. **Implement platform service**
   - Extend the base platform interface
   - Implement webhook handling
   - Add message delivery logic

3. **Update worker service**
   - Add platform-specific delivery logic
   - Update system prompts for platform

### Code Structure

```
src/
├── common/           # Shared utilities and constants
├── config/           # Database configuration and entities
├── health/           # Health check endpoints
├── queue/            # Message queue management
├── telegram/         # Telegram integration
├── worker/           # Message processing workers
├── app.module.ts     # Main application module
└── main.ts           # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- Create an issue for bugs or feature requests
- Check the documentation
- Review the health endpoints for system status

## 🔮 Roadmap

- [ ] WhatsApp Business API integration
- [ ] Instagram Graph API integration
- [ ] Discord bot integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Voice message processing
- [ ] Image and file handling
- [ ] Advanced AI features (sentiment analysis, intent detection)


