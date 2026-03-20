# Semantic Preserving Code Translation Using Small Language Model

A hybrid compiler-AI system that translates code between programming languages while maintaining semantic fidelity. This project combines Abstract Syntax Tree (AST) parsing with Small Language Model (SLM) translation for accurate, offline-capable code conversion.

##  Architectures

The system consists of two main components:
- **Frontend**: React-based web interface with visualization
- **Backend**: FastAPI server for code translation processing

### Frontend (Semantic Code Weaver)
- **Technology Stack**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Framework**: shadcn/ui components
- **State Management**: React hooks and context
- **Translation Engine**: WebLLM for local processing

### Backend (FastAPI)
- **Technology Stack**: Python, FastAPI, Uvicorn
- **Purpose**: API endpoints for code translation and model management
- **Features**: CORS support, health checks, translation endpoints

## Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- npm or yarn package manager

### Frontend Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access Application**
   - Open http://localhost:8080 in your browser

### Backend Setup

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start FastAPI Server**
   ```bash
   python main.py
   ```

4. **Access API Documentation**
   - API Base URL: http://localhost:8000
   - Interactive Docs: http://localhost:8000/docs
   - Model Status: http://localhost:8000/model/status

##  Project Structure

```
semantic-code-weaver/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── ArchitectureDiagram.tsx
│   │   │   ├── Header.tsx
│   │   │   └── TranslationModeSelector.tsx
│   │   ├── pages/             # Page components
│   │   │   └── Index.tsx
│   │   └── ...                # Other source files
│   ├── public/                # Static assets
│   ├── package.json           # Frontend dependencies
│   └── vite.config.ts         # Vite configuration
├── backend/                    # FastAPI application
│   ├── main.py               # Main FastAPI application
│   ├── requirements.txt      # Python dependencies
│   └── .gitignore           # Git ignore file
├── README.md                 # This documentation
└── ...                      # Other project files
```

##  Available Scripts

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Backend Commands
- `python main.py` - Start FastAPI development server
- `pip install -r requirements.txt` - Install dependencies

##  API Endpoints

### Backend API Documentation

#### Base URL: `http://localhost:8000`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root endpoint - API status |
| `/health` | GET | Health check endpoint |
| `/model/status` | GET | Model connection status |
| `/translate` | POST | Code translation endpoint |

#### Translation Endpoint
```http
POST /translate
Content-Type: application/json

{
  "code": "your source code",
  "source_lang": "python",
  "target_lang": "javascript"
}
```

**Response:**
```json
{
  "message": "Successfully connected to the model",
  "status": "success",
  "original_code": "your source code",
  "source_language": "python",
  "target_language": "javascript",
  "translated_code": "# Translated code",
  "confidence": 0.95
}
```

##  Features

### Frontend Features
- **Code Translation Interface**: Input and output code editors
- **Language Selection**: Support for multiple programming languages
- **Translation Modes**: Cloud AI and Local SLM options
- **Architecture Visualization**: Interactive diagram of the translation pipeline
- **Example Snippets**: Pre-built code examples for testing
- **Responsive Design**: Mobile-friendly interface

### Backend Features
- **RESTful API**: Clean, documented API endpoints
- **CORS Support**: Cross-origin requests enabled
- **Health Monitoring**: Built-in health check endpoints
- **Model Status**: Real-time model connection status
- **Error Handling**: Comprehensive error responses

## 🔧 Configuration

### Frontend Configuration
- **Vite Config**: `vite.config.ts`
- **TypeScript Config**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- **Tailwind Config**: `tailwind.config.ts`
- **Environment Variables**: `.env` file

### Backend Configuration
- **FastAPI Config**: Configured in `main.py`
- **CORS Settings**: Allows frontend at localhost:8080
- **Server Settings**: Runs on 0.0.0.0:8000

##  Testing

### Frontend Testing
```bash
# Run linting
npm run lint

# Build and preview
npm run build
npm run preview
```

### Backend Testing
```bash
# Test model status endpoint
curl http://localhost:8000/model/status

# Test translation endpoint
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"code": "print("hello")", "source_lang": "python", "target_lang": "javascript"}'
```

## Deployment

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `dist/` folder to your hosting service

### Backend Deployment
1. Install dependencies: `pip install -r requirements.txt`
2. Run with production server: `uvicorn main:app --host 0.0.0.0 --port 8000`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is a university demonstration project for semantic preserving code translation using Small Language Models.

## Support

For questions or issues:
- Check the API documentation at http://localhost:8000/docs
- Verify both frontend and backend are running
- Check console logs for error messages

---

**Note**: This is a demonstration project showcasing hybrid compiler-AI code translation technology.
