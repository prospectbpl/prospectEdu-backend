// src/utils/mailer.js
import nodemailer from "nodemailer";

function makeTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/* ---------------- EXISTING: Doubt Answer Email ---------------- */
export async function sendDoubtAnswerEmail({ to, parentName, teacherName, subject, question, answer }) {
  const transporter = makeTransporter();

  const safeParent = parentName?.trim() || "Parent";
  const safeTeacher = teacherName?.trim() || "Teacher";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color:#111827;">
      <h2 style="color:#124734; margin:0 0 12px;">Hello ${safeParent},</h2>
      <p style="margin:0 0 12px;">
        Your doubt has been answered by <b>${safeTeacher}</b>.
      </p>

      <div style="background:#F9FAFB;border:1px solid #e5e7eb;padding:14px;border-radius:12px;">
        <p style="margin:0 0 8px;"><b>Subject:</b> ${subject || "-"}</p>
        <p style="margin:0 0 8px;"><b>Your Question:</b> ${question || "-"}</p>
        <p style="margin:0;"><b>Teacher's Answer:</b> ${answer || "-"}</p>
      </div>

      <p style="margin:18px 0 0; color:#6b7280;">
        Regards,<br/>
        <b>Prospect Education Team</b>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Doubt Answered: ${subject || "Your Query"}`,
    html,
  });
}

/* ---------------- NEW: Product Restock Email ---------------- */
export async function sendProductRestockEmail({ to, name, productName, productUrl }) {
  const transporter = makeTransporter();

  const safeName = name?.trim() ? name.trim() : "Customer";
  const subject = `Back in stock: ${productName} 🎉`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color:#111827;">
      <h2 style="margin:0 0 12px; color:#124734;">Hello ${safeName},</h2>

      <p style="margin:0 0 12px;">
        Good news! The product you requested is now <b>back in stock</b>.
      </p>

      <div style="background:#F9FAFB;border:1px solid #e5e7eb;padding:14px;border-radius:12px;">
        <p style="margin:0;"><b>Product:</b> ${productName}</p>
      </div>

      ${
        productUrl
          ? `<p style="margin:14px 0 0;">
               <a href="${productUrl}" style="display:inline-block;background:#124734;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;">
                 View Product
               </a>
             </p>`
          : `<p style="margin:14px 0 0;">Open the app and check the product page.</p>`
      }

      <p style="margin:18px 0 0; color:#6b7280;">
        Thanks for shopping with us!<br/>
        <b>Prospect Education Store Team</b>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}
