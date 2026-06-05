"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import {
  FileText, Upload, Trash2, AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import type { OrganizationDocument, DocumentType, DocumentStatus } from "@prisma/client";

const DOC_TYPE_OPTIONS = [
  { value: "IRS_DETERMINATION_LETTER", label: "IRS Determination Letter" },
  { value: "ARTICLES_OF_INCORPORATION", label: "Articles of Incorporation" },
  { value: "BYLAWS", label: "Bylaws" },
  { value: "FINANCIAL_STATEMENTS", label: "Financial Statements" },
  { value: "AUDIT_REPORT", label: "Audit Report" },
  { value: "BUDGET", label: "Budget" },
  { value: "BOARD_LIST", label: "Board Member List" },
  { value: "STAFF_RESUMES", label: "Staff / Key Personnel Resumes" },
  { value: "ANNUAL_REPORT", label: "Annual Report" },
  { value: "PROJECT_PLAN", label: "Project Plan" },
  { value: "LOGIC_MODEL", label: "Logic Model" },
  { value: "LETTER_OF_SUPPORT", label: "Letter of Support" },
  { value: "PROOF_OF_IMPACT", label: "Proof of Impact" },
  { value: "PHOTO_VIDEO", label: "Photo / Video" },
  { value: "FLYER_MARKETING", label: "Flyer / Marketing Material" },
  { value: "OTHER", label: "Other" },
];

const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:        { label: "Active",         color: "bg-green-100 text-green-700", icon: CheckCircle },
  EXPIRING_SOON: { label: "Expiring Soon",  color: "bg-amber-100 text-amber-700", icon: Clock },
  EXPIRED:       { label: "Expired",        color: "bg-red-100 text-red-700",     icon: AlertTriangle },
  NEEDS_UPDATE:  { label: "Needs Update",   color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

interface Props {
  organizationId: string;
  documents: OrganizationDocument[];
}

export function OrgDocumentsPanel({ organizationId, documents }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("IRS_DETERMINATION_LETTER");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    setUploadedFiles(accepted);
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  async function handleUpload() {
    if (!uploadedFiles.length) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("organizationId", organizationId);
      formData.append("docType", docType);
      uploadedFiles.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/organizations/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      setUploadedFiles([]);
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Remove this document?")) return;
    await fetch(`/api/organizations/documents/${docId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card padding="none">
      <CardHeader className="px-5 pt-4 pb-3 border-b border-gray-100">
        <CardTitle>Documents Library</CardTitle>
        <span className="text-xs text-gray-400">{documents.length} document{documents.length !== 1 ? "s" : ""} stored</span>
      </CardHeader>

      {/* Upload area */}
      <div className="p-5 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="col-span-2">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-brand-400 bg-brand-50"
                  : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
              )}
            >
              <input {...getInputProps()} />
              <Upload size={20} className="mx-auto text-gray-400 mb-2" />
              {uploadedFiles.length > 0 ? (
                <div>
                  {uploadedFiles.map((f) => (
                    <p key={f.name} className="text-sm font-medium text-brand-700">{f.name}</p>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLS, PNG, JPG — max 10MB each</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Select
              label="Document type"
              options={DOC_TYPE_OPTIONS}
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
            />
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!uploadedFiles.length}
              icon={<Upload size={14} />}
            >
              Upload
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <FileText size={28} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No documents uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload your IRS letter, financials, board list, and other reusable documents
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {documents.map((doc) => {
            const statusConfig = STATUS_CONFIG[doc.status];
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <FileText size={18} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.fileName} · {(doc.fileSize / 1024).toFixed(0)} KB
                    {doc.expiresAt && ` · Expires ${formatDate(doc.expiresAt)}`}
                  </p>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", statusConfig.color)}>
                  <StatusIcon size={11} />
                  {statusConfig.label}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(doc.createdAt)}</span>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Remove document"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
