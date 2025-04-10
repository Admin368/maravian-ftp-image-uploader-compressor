# Maravian Photo Uploader 🚀

A powerful and efficient FTP-based image upload system with automatic compression optimization. Built with Node.js, Express, and Next.js, this project helps you manage and optimize image uploads with ease.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## ✨ Features

- 🖼️ Automatic image compression and optimization
- 📁 FTP integration for secure file storage
- 🔒 Page password protection
- 🎯 Configurable compression settings
- 🚀 Fast and efficient uploads
- 📱 Responsive UI
- 🔄 Automatic thumbnail generation
- 🛡️ TypeScript support
- 🐳 Docker support for easy deployment

## 🏗️ Project Structure

This project consists of two main components:

1. **Frontend (Next.js)**: The user interface for uploading and managing images
2. **Backend Server (Express)**: Handles file uploads, compression, and FTP operations

The backend server must be hosted separately from the frontend, preferably using Docker for easy deployment and scaling.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or pnpm
- FTP server access
- Docker (for server deployment)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/maravian-photo-uploader.git
   cd maravian-photo-uploader
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy the environment example file:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`

5. Start the development server:
   ```bash
   pnpm dev
   ```

## 🐳 Server Deployment with Docker

The backend server is designed to be deployed separately from the frontend. Docker is the recommended deployment method.

### Using Docker Compose

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Create a `.env` file with your configuration:

   ```bash
   cp ../.env.example .env
   ```

3. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

### Manual Docker Deployment

1. Build the Docker image:

   ```bash
   docker build -t maravian-photo-uploader-server .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name maravian-photo-uploader \
     -p 3001:3001 \
     --env-file .env \
     maravian-photo-uploader-server
   ```

### Environment Variables for Server

Copy `.env.example` to `.env` in the server directory and configure the following variables:

- `FTP_HOST`: Your FTP server hostname
- `FTP_USER`: FTP username
- `FTP_PASSWORD`: FTP password
- `DOMAIN_PREFIX`: Your domain prefix for URLs
- `PAGE_PASSWORD`: Password for page access
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `FTP_HOST`: Your FTP server hostname
- `FTP_USER`: FTP username
- `FTP_PASSWORD`: FTP password
- `DOMAIN_PREFIX`: Your domain prefix for URLs
- `PAGE_PASSWORD`: Password for page access
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Keep the code clean and maintainable

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [basic-ftp](https://github.com/patrickjuchli/basic-ftp) for FTP functionality
- [sharp](https://sharp.pixelplumbing.com/) for image processing
- [Next.js](https://nextjs.org/) for the frontend framework

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/maravian-photo-uploader](https://github.com/yourusername/maravian-photo-uploader)
