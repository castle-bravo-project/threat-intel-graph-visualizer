# 🛡️ Threat Intel Graph Visualizer

[![Deploy to GitHub Pages](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

> **Advanced threat intelligence visualization platform with AI-powered analysis and progressive enhancement architecture**

A sophisticated web application for visualizing and analyzing threat intelligence data from MISP (Malware Information Sharing Platform) reports. Features interactive graph visualization, geographic mapping, AI-powered threat analysis, and comprehensive reporting capabilities.

## 🌟 Features

### 📊 **Interactive Visualization**
- **Dynamic Graph Visualization**: Interactive force-directed graphs with D3.js
- **Geographic Mapping**: Real-time IP geolocation with Leaflet maps
- **Multi-View Analysis**: Graph, Map, Threat, ATT&CK, Campaign, and AS views
- **Advanced Filtering**: Search, clustering, and pathfinding capabilities

### 🤖 **AI-Powered Analysis** (Requires API Key)
- **Threat Landscape Analysis**: Expert-level threat assessment and risk scoring
- **MITRE ATT&CK Mapping**: Automatic mapping to tactics and techniques
- **Attack Chain Visualization**: AI-generated attack flow diagrams
- **Custom YARA Rules**: Automated rule generation from indicators
- **Threat Intelligence Enrichment**: Enhanced IOC analysis with contextual data

### 🔧 **Progressive Enhancement Architecture**
- **Demo Mode**: Full visualization without API key requirements
- **Graceful Degradation**: Educational content when AI features unavailable
- **User-Controlled Privacy**: Client-side API key storage only
- **Zero Server Dependencies**: Completely client-side application

### 📈 **Advanced Analytics**
- **ASN Analysis**: Autonomous System visualization and clustering
- **Indicator Enrichment**: Simulated threat intelligence data
- **Campaign Analysis**: Multi-stage attack visualization
- **Export Capabilities**: Comprehensive HTML reports with embedded diagrams

## 🚀 Live Demo

**🌐 [Try it now on GitHub Pages](https://castle-bravo-project.github.io/threat-intel-graph-visualizer/)**

- **Demo Mode**: Explore all visualization features immediately
- **Full AI Mode**: Add your Google Gemini API key for complete functionality

## 🛠️ Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **Google Gemini API Key** (optional, for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/castle-bravo-project/threat-intel-graph-visualizer.git
   cd threat-intel-graph-visualizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### 🔑 API Key Setup (Optional)

#### Option 1: Environment Variable (Development)
Create a `.env.local` file in the project root:
```env
GEMINI_API_KEY=your_api_key_here
```

#### Option 2: Runtime Configuration (Recommended)
1. Visit the application in your browser
2. Click "Add API Key" in the banner
3. Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
4. Enter your key - it's stored locally and never sent to our servers

## 📖 Usage Guide

### 🎯 Getting Started
1. **Load Sample Data**: The app comes with sample MISP data pre-loaded
2. **Upload Your Data**: Use JSON files from MISP exports or sandbox reports
3. **Explore Visualizations**: Switch between different view modes
4. **Enable AI Features**: Add your API key for advanced analysis

### 🔍 Core Workflows

#### Basic Threat Analysis
1. **Visualize Report** → Load your MISP JSON data
2. **Analyze** → Get AI-powered threat assessment
3. **ATT&CK Map** → Map to MITRE framework
4. **Generate Report** → Create comprehensive analysis

#### Advanced Investigation
1. **Search & Filter** → Find specific indicators
2. **Pathfinding** → Trace attack paths between indicators
3. **Clustering** → Group related activities
4. **Enrichment** → Get detailed IOC intelligence

### 📊 View Modes

| View | Description | Requirements |
|------|-------------|--------------|
| **Graph** | Interactive network visualization | None |
| **Map** | Geographic IP distribution | GeoIP data |
| **Threat** | Key indicators focus | AI Analysis |
| **ATT&CK** | MITRE framework mapping | AI Analysis |
| **Campaign** | Multi-stage attack view | AI Analysis |
| **AS View** | Autonomous System analysis | ASN enrichment |
| **Report** | Comprehensive HTML export | Full AI pipeline |

## 🏗️ Architecture

### Progressive Enhancement Design
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Demo Mode     │    │   Hybrid Mode    │    │  Full AI Mode   │
│                 │    │                  │    │                 │
│ • Visualization │ -> │ • Visualization  │ -> │ • Visualization │
│ • Static Data   │    │ • Env API Key    │    │ • User API Key  │
│ • Educational   │    │ • Limited AI     │    │ • Full AI Suite │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Visualization**: D3.js, Leaflet
- **AI Integration**: Google Gemini API
- **Build Tool**: Vite
- **Deployment**: GitHub Pages with Actions
- **Data Processing**: Client-side JSON parsing

## 🔒 Privacy & Security

### Data Handling
- **No Server Storage**: All processing happens in your browser
- **Local API Keys**: Stored in browser localStorage only
- **Direct API Calls**: Communication only with Google's Gemini API
- **No Telemetry**: No usage tracking or data collection

### Security Features
- **Client-Side Only**: No backend servers to compromise
- **API Key Control**: Users manage their own credentials
- **Open Source**: Full transparency of code and functionality
- **HTTPS Deployment**: Secure communication channels

## 🚀 Deployment

### GitHub Pages (Automatic)
The application automatically deploys to GitHub Pages on every push to `main`:
- **URL**: `https://castle-bravo-project.github.io/threat-intel-graph-visualizer/`
- **Workflow**: `.github/workflows/deploy.yml`
- **Build**: Vite production build with optimizations

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy the dist/ folder to your hosting provider
npm run preview  # Test production build locally
```

### Environment Configuration
- **Development**: `npm run dev` (localhost:5173)
- **Production**: Optimized build with proper base paths
- **GitHub Pages**: Automatic deployment with client-side routing

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Automated code formatting
- **Testing**: Component and integration tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MISP Project**: For the threat intelligence data format
- **MITRE ATT&CK**: For the cybersecurity framework
- **Google Gemini**: For AI-powered analysis capabilities
- **D3.js Community**: For powerful visualization tools
- **Open Source Community**: For the amazing libraries and tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/discussions)
- **Documentation**: [Wiki](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/wiki)

---

<div align="center">

**🏰 Castle Bravo Project**
*Open Code. Open Defense. Open Future.*

[![GitHub stars](https://img.shields.io/github/stars/castle-bravo-project/threat-intel-graph-visualizer?style=social)](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/castle-bravo-project/threat-intel-graph-visualizer?style=social)](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/network/members)

</div>
