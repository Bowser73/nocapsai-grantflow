"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Loader2, AlertCircle } from "lucide-react";

const ORG_TYPE_OPTIONS = [
  { value: "NONPROFIT_501C3", label: "501(c)(3) Nonprofit", category: "nonprofit" },
  { value: "NONPROFIT_501C4", label: "501(c)(4) Nonprofit", category: "nonprofit" },
  { value: "NONPROFIT_OTHER", label: "Other Nonprofit", category: "nonprofit" },
  { value: "SMALL_BUSINESS", label: "Small Business / LLC / Corp", category: "business" },
  { value: "SCHOOL_K12", label: "K-12 School / District", category: "other" },
  { value: "HIGHER_EDUCATION", label: "College / University", category: "other" },
  { value: "GOVERNMENT", label: "Government Agency", category: "other" },
  { value: "TRIBAL", label: "Tribal Organization", category: "other" },
  { value: "COMMUNITY_GROUP", label: "Community Group (unincorporated)", category: "other" },
  { value: "INDIVIDUAL", label: "Individual / Sole Proprietor", category: "other" },
  { value: "OTHER", label: "Other", category: "other" },
];

interface FormErrors {
  name?: string;
  orgType?: string;
  website?: string;
  general?: string;
}

export function NewOrgForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState({
    name: "",
    orgType: "",
    missionStatement: "",
    website: "",
    city: "",
    state: "",
    switchToNew: true,
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = "Organization name is required";
    if (!form.orgType) newErrors.orgType = "Please select an organization type";
    if (form.website && !/^https?:\/\/.+/.test(form.website)) {
      newErrors.website = "Must start with http:// or https://";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error || "Failed to create organization" });
        return;
      }
      // Refresh so layout re-reads the new active org from DB
      router.refresh();
      router.push("/profile");
    } catch {
      setErrors({ general: "Network error — please try again" });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCategory = ORG_TYPE_OPTIONS.find((o) => o.value === form.orgType)?.category;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errors.general}
        </div>
      )}

      {/* Org type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Organization type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {/* Quick-select cards for common types */}
          <button
            type="button"
            onClick={() => set("orgType", "NONPROFIT_501C3")}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
              selectedCategory === "nonprofit"
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-gray-200 hover:border-gray-300 text-gray-700"
            }`}
          >
            <Building2 className="h-5 w-5 shrink-0" />
            <div>
              <div className="text-sm font-medium">Nonprofit</div>
              <div className="text-xs text-gray-500">501(c)(3), 501(c)(4), other</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => set("orgType", "SMALL_BUSINESS")}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
              selectedCategory === "business"
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-gray-200 hover:border-gray-300 text-gray-700"
            }`}
          >
            <Briefcase className="h-5 w-5 shrink-0" />
            <div>
              <div className="text-sm font-medium">Business / LLC</div>
              <div className="text-xs text-gray-500">Small business, startup, corp</div>
            </div>
          </button>
        </div>
        <select
          value={form.orgType}
          onChange={(e) => set("orgType", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">— Select exact type —</option>
          {ORG_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.orgType && (
          <p className="mt-1 text-xs text-red-600">{errors.orgType}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Organization name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Twizted Journeys Inc., NoCapsAI LLC"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Mission */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mission / purpose{" "}
          <span className="text-gray-400 font-normal">(optional — helps Funding Scout)</span>
        </label>
        <textarea
          value={form.missionStatement}
          onChange={(e) => set("missionStatement", e.target.value)}
          rows={3}
          placeholder={
            selectedCategory === "business"
              ? "e.g. AI-powered automation tools for small businesses and nonprofits"
              : "e.g. Raising mental health awareness and supporting suicide loss survivors in Indiana"
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="e.g. Shelbyville"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            placeholder="e.g. IN"
            maxLength={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Website <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={form.website}
          onChange={(e) => set("website", e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.website && (
          <p className="mt-1 text-xs text-red-600">{errors.website}</p>
        )}
      </div>

      {/* Switch toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          id="switchToNew"
          checked={form.switchToNew}
          onChange={(e) => set("switchToNew", e.target.checked)}
          className="h-4 w-4 text-brand-600 rounded border-gray-300"
        />
        <label htmlFor="switchToNew" className="text-sm text-gray-700">
          Switch to this profile after creating it
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating…
          </>
        ) : (
          "Create organization"
        )}
      </button>
    </form>
  );
}
