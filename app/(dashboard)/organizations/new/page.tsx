import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { NewOrgForm } from "@/components/organizations/new-org-form";

export default function NewOrganizationPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
          <Plus className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add organization</h1>
          <p className="text-sm text-gray-500">
            Create a new profile to track grants for a different client or org
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <NewOrgForm />
      </div>

      {/* Note */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        You can complete the full organization profile after creating it.
      </p>
    </div>
  );
}
