<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

# 🎉 Welcome to the NestJS Image Augmentation Project! 🎉

---

🚀 **Kickstart your image augmentation project with this comprehensive NestJS setup!** 🚀

This project is designed to provide you with a solid foundation for building a scalable and maintainable server-side application focused on **image augmentation** using **NestJS**. It comes packed with essential features to streamline your development process.

---

## ✨ Features ✨

---

- **🌐 REST API**: Classic REST approach available in the `master` branch.

- **🔑 JWT Authentication**: Authorization is handled using **JWT** and **passport-jwt**, ensuring secure and stateless authentication.

- **🛡️ Role-Based Access Control**: Effortlessly manage user roles and permissions to ensure the right access levels.

- **🌐 Internationalization Support**: Seamlessly support multiple languages and locales to reach a global audience.

- **📜 Swagger Documentation**: Automatically generated API documentation to help you and your team understand and use the API effectively.

- **🛠️ Modular Architecture**: Clean and organized structure to facilitate scalability and maintainability.

- **⚡ High Performance**: Optimized for speed and efficiency, ensuring your application runs smoothly.

- **🖼️ Image Augmentation**:
  - **Supported Formats**: `.png`, `.jpg`, `.jpeg`, `.webp`
  - **Types of Augmentations**: Rotation, sharpening, creation of multiple image versions
  - **S3 Uploads with ZIP Archive Creation**: Upload augmented images to S3 with the ability to create ZIP archives.

---

## 📘 Introduction

This project is structured to help you quickly start developing your NestJS application focused on image augmentation. Here's how you can make the most of it:

- **Application**: The `apps/main` directory contains the main application responsible for handling image augmentation.

- **Modules**: Add new features by creating modules in the `apps/main/src/modules` directory. Each module encapsulates related functionality, including controllers, services, and repositories.

- **Controllers**: Define your API endpoints in controllers. Place them in the respective module's directory under `apps/main/src/modules`.

- **Services**: Implement your business logic in services. These should also be placed within the module's directory.

- **Repositories**: Interact with the database using repositories. Define them in the module's directory and use Prisma or TypeORM for database operations.

- **DTOs (Data Transfer Objects)**: Define DTOs in the `dto` directory within each module to validate and type-check incoming data.

- **Guards and Interceptors**: Implement guards and interceptors in the `libs/common/src/guards` directory to handle cross-cutting concerns like authentication and logging.

- **Configuration**: Manage application configuration using the `ConfigModule` in `apps/main/src/config`. Environment variables can be defined in `.env` files.

- **Internationalization**: Add translations in the `libs/i18n` directory to support multiple languages.

- **Swagger Documentation**: Automatically generate API documentation by annotating your controllers and DTOs with Swagger decorators.

---

## 📚 Application Structure

### Main Application (apps/main)

- **Main Application**: Handles image augmentation processes.
- **Port**: 3000
- **Swagger**: [http://localhost:3000/api](http://localhost:3000/api)

---

## 🚀 How to Run the Project

To run this project, follow these steps:

1. **Clone Your Repository**: Clone your repository to your local machine.

   ```bash
   git clone https://github.com/idmaksim/augmentor-backend.git
   ```

2. **Install Dependencies**: Navigate to the project directory and install the necessary dependencies.

   ```bash
   cd https://github.com/idmaksim/augmentor-backend.git
   npm install
   ```

3. **Set Up Environment Variables**: Create a `.env` file in the root directory and configure your environment variables. Refer to `.env.example` for guidance.

4. **Database Setup**: Ensure your database is running and configured correctly. Use Prisma or TypeORM migrations to set up your database schema.

5. **Run the Application**: Start the application in development mode.

   ```bash
   npm run start:dev
   ```

6. **Access Swagger Documentation**: Visit [http://localhost:3000/api](http://localhost:3000/api) to view the automatically generated Swagger documentation.

7. **Explore and Customize**: Explore the codebase, add new features, and customize the project to fit your needs.

---

This project was generated from [github.com/idmaksim/nestjs-base-template](https://github.com/idmaksim/nestjs-base-template). Use it to quickly start your image augmentation project! 🚀
