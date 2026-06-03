import Job from "./job.model.js";
import JobApplication from "./jobApplication.model.js";

import { uploadBufferToCloudinaryAny } from "../../utils/cloudinaryUploadAny.js";
import { deleteFromCloudinary } from "../../utils/cloudinaryDelete.js";

/** PUBLIC: list jobs */
export async function listJobs(req, res, next) {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === "true") filter.isActive = true;

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, jobs });
  } catch (e) {
    next(e);
  }
}

/** PUBLIC: job detail */
export async function getJobById(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    return res.json({ success: true, job });
  } catch (e) {
    next(e);
  }
}

/** ADMIN: create job */
export async function createJob(req, res, next) {
  try {
    const { title, vacancy, location, jobType, description, isActive } =
      req.body;

    const job = await Job.create({
      title,
      vacancy,
      location,
      jobType,
      description,
      isActive: isActive ?? true,
      createdBy: req.user?._id || req.user?.id || null,
    });

    return res.status(201).json({ success: true, job });
  } catch (e) {
    next(e);
  }
}

/** ADMIN: update job */
export async function updateJob(req, res, next) {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    return res.json({ success: true, job });
  } catch (e) {
    next(e);
  }
}

/** ADMIN: delete job (also deletes applications + resumes from cloudinary) */
export async function deleteJob(req, res, next) {
  try {
    const jobId = req.params.id;

    const job = await Job.findByIdAndDelete(jobId);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    // ✅ delete resumes from cloudinary (if any) before deleting applications
    const apps = await JobApplication.find({ job: jobId }).lean();

    for (const a of apps) {
      if (a.resumePublicId) {
        try {
          // ✅ PDFs are stored as raw
          await deleteFromCloudinary(a.resumePublicId, "raw");
        } catch (err) {
          // don't block deletion if cloudinary delete fails
          console.error("Cloudinary resume delete failed:", err?.message || err);
        }
      }
    }

    // ✅ delete applications of this job
    await JobApplication.deleteMany({ job: jobId });

    return res.json({ success: true, message: "Job deleted" });
  } catch (e) {
    next(e);
  }
}

/** PUBLIC: apply job (resume saved to cloudinary as PDF/raw) */
export async function applyToJob(req, res, next) {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job || job.isActive === false) {
      return res
        .status(404)
        .json({ success: false, message: "Job not available" });
    }

    const { name, email, phone, highestEducation, canRelocate, fluentIn } =
      req.body;

    // ✅ Resume upload to Cloudinary
    let resumeUrl = "";
    let resumePublicId = "";
    let resumeOriginalName = "";

    // NOTE: This requires multer memoryStorage (pdfUpload) so req.file.buffer exists
    if (req.file?.buffer) {
      resumeOriginalName = req.file.originalname || "resume.pdf";

      const uploaded = await uploadBufferToCloudinaryAny({
        buffer: req.file.buffer,
        folder: "careers/resumes",
        resource_type: "raw", // ✅ IMPORTANT for PDF
      });

      resumeUrl = uploaded?.secure_url || "";
      resumePublicId = uploaded?.public_id || "";
    }

    const application = await JobApplication.create({
      job: id,
      name,
      email,
      phone,
      highestEducation,
      canRelocate,
      fluentIn,
      resumeUrl,
      resumePublicId,
      resumeOriginalName,
    });

    return res.status(201).json({ success: true, application });
  } catch (e) {
    next(e);
  }
}

/** ADMIN: list applications */
export async function listApplications(req, res, next) {
  try {
    const apps = await JobApplication.find()
      .populate("job")
      .sort({ createdAt: -1 });

    return res.json({ success: true, applications: apps });
  } catch (e) {
    next(e);
  }
}

/** ADMIN: update application status */
export async function updateApplicationStatus(req, res, next) {
  try {
    const { status } = req.body;

    const updated = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("job");

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });

    return res.json({ success: true, application: updated });
  } catch (e) {
    next(e);
  }
}
