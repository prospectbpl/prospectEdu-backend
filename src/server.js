import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "./db/connect.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/error.js";


import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js"
import addressesRoutes from "./modules/addresses/addresses.routes.js";
import supplierRoutes from "./modules/suppliers/supplier.routes.js";
import productRoutes from "./modules/products/product.routes.js";


import cartRoutes from "./modules/cart/cart.routes.js";
import wishlistRoutes from "./modules/wishlist/wishlist.routes.js";
import orderRoutes from "./modules/orders/order.routes.js";
import scholarshipRoutes from "./modules/scholarship/scholarship.routes.js"; 
import achieverRoutes from "./modules/achievers/achiever.routes.js";
import researchRoutes from "./modules/research/research.routes.js";

import donationRoutes from "./modules/donations/donation.routes.js";
import doubtRoutes from "./modules/doubts/doubt.routes.js";
import contactRoutes from "./modules/contacts/contact.routes.js";
import newsRoutes from "./modules/news/news.routes.js";
import testSeriesRoutes from "./modules/testSeries/testSeries.routes.js";


import testPurchaseRoutes from "./modules/testPurchase/testPurchase.routes.js";
import blogRoutes from "./modules/blog/blog.routes.js";
import announcementRoutes from "./modules/announcements/announcement.routes.js";
import liveTestsRoutes from "./modules/liveTests/liveTests.routes.js";
import parentDoubtRoutes from "./modules/parentDoubts/parentDoubt.routes.js";
import supportTicketRoutes from "./modules/support/supportTicket.routes.js";

import categoryRoutes from "./modules/categories/category.routes.js";
import careerRoutes from "./modules/careers/career.routes.js";

import studentsRoutes from "./modules/students/students.routes.js";
import coursesRoutes from "./modules/courses/courses.routes.js";
import contentRoutes from "./modules/courses/content.routes.js";

import CoursecategoryRoutes from "./modules/courseCategories/category.routes.js";
import purchaseRoutes from "./modules/purchases/purchase.routes.js";
import activityRoutes from "./modules/activity/activity.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";

import teacherProfileRoutes from "./modules/teachers/teacherProfile.routes.js";
import assignmentsRoutes from "./modules/assignments/assignments.routes.js";
import quizzesRouter from "./modules/quizzes/quizzes.routes.js";
import adminDashboardRouter from "./modules/adminDashboard/adminDashboard.routes.js";




import studyMaterialsRoutes from "./modules/study-materials/studyMaterials.routes.js";
import activityRoutesstudentdashboard from "./modules/studentdashboard/activity.routes.js";
import parentsRoutes from "./modules/parents/parents.routes.js";
import paymentsRoutes from "./modules/teacherparentpayments/payments.routes.js";
import overallPerformanceRoutes from "./modules/performance/overallPerformance.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";



// import razorpayRoutes from "./modules/payments/razorpay.routes.js";
// // routes (we’ll add auth first)


const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());

connectDB();

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Server is running prospect 🚀");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});


  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/addresses", addressesRoutes);
  app.use("/api/v1/suppliers", supplierRoutes);
  app.use("/api/v1/products", productRoutes);


  app.use("/api/v1/cart", cartRoutes);
  app.use("/api/v1/wishlist", wishlistRoutes);
  app.use("/api/v1/orders", orderRoutes);
  app.use("/api/v1/scholarship", scholarshipRoutes);
  app.use("/api/v1/achievers", achieverRoutes);
  app.use("/api/v1/research", researchRoutes);


  app.use("/api/v1/donations", donationRoutes);
  app.use("/api/v1/doubts", doubtRoutes);
  app.use("/api/v1/contacts", contactRoutes);
  app.use("/api/v1/news", newsRoutes);
  app.use("/api/v1/test-series", testSeriesRoutes);


  app.use("/api/v1/test-purchase", testPurchaseRoutes);
  app.use("/api/v1/blogs", blogRoutes);
  app.use("/api/v1/announcements", announcementRoutes);
  app.use("/api/v1/live-tests", liveTestsRoutes);
  app.use("/api/v1/parentdoubts", parentDoubtRoutes);
  app.use("/api/v1/support-tickets", supportTicketRoutes);

  app.use("/api/v1/categories", categoryRoutes);
  app.use("/api/v1/careers", careerRoutes);

  
  app.use("/api/v1/students", studentsRoutes);
  app.use("/api/v1/courses", coursesRoutes);
  app.use("/api/v1/content", contentRoutes);
  
  app.use("/api/v1/course-categories", CoursecategoryRoutes);
  app.use("/api/v1/purchases", purchaseRoutes);
  app.use("/api/v1/activity", activityRoutes);
  app.use("/api/v1/uploads", uploadsRoutes);
  
  app.use("/api/v1/teachers/profile", teacherProfileRoutes);
  app.use("/api/v1/assignments", assignmentsRoutes);
  app.use("/api/v1/quizzes", quizzesRouter);
  app.use("/api/v1/admin", adminDashboardRouter);
  
  
  app.use("/api/v1/study-materials", studyMaterialsRoutes);
  app.use("/api/v1/performance", overallPerformanceRoutes);
  app.use("/api/v1/parents", parentsRoutes);
  app.use("/api/v1/payments", paymentsRoutes);
  app.use("/api/v1/activity", activityRoutesstudentdashboard);
  app.use("/api/v1/reports", reportsRoutes);
  
  app.use(notFound);
  app.use(errorHandler);
  
  
  app.use("/uploads", express.static("uploads"));

  // // static for resumes
  
  // app.use("/api/v1/payments", razorpayRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});