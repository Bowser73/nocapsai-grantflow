"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, DollarSign, MapPin, Users, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organization } from "@prisma/client";

const ORG_TYPE_OPTIONS = [
  { value: "NONPROFIT_501C3",    label: "Nonprofit 501(c)(3)" },
  { value: "NONPROFIT_501C4",    label: "Nonprofit 501(c)(4)" },
  { value: "NONPROFIT_OTHER",    label: "Nonprofit (Other)" },
  { value: "SMALL_BUSINESS",     label: "Small Business" },
  { value: "SCHOOL_K12",         label: "K-12 School / District" },
  { value: "HIGHER_EDUCATION",   label: "College / University" },
  { value: "GOVERNMENT",         label: "Government Agency" },
  { value: "TRIBAL",             label: "Tribal Organization" },
  { value: "COMMUNITY_GROUP",    label: "Community Group" },
  { value: "INDIVIDUAL",         label: "Individual" },
  { value: "OTHER",              label: "Other" },
];

const STATE_OPTIONS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
].map((s) => ({ value: s, label: s }));

const FISCAL_YEAR_OPTIONS = [
  { value: "December 31",  label: "December 31" },
  { value: "June 30",      label: "June 30" },
  { value: "September 30", label: "September 30" },
  { value: "March 31",     label: "March 31" },
];

const STEPS = [
  { id: "basics",   label: "Basics",    icon: Building2 },
  { id: "mission",  label: "Mission",   icon: Users },
  { id: "location", label: "Location",  icon: MapPin },
  { id: "finance",  label: "Finances",  icon: DollarSign },
];

interface Props {
  org: Organization | null;
  userId: string;
}

export function OrgProfileForm({ org, userId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name:               org?.name ?? "",
    ein:                org?.ein ?? "",
    orgType:            org?.orgType ?? "NONPROFIT_501C3",
    nonprofitStatus:    org?.nonprofitStatus ?? "",
    missionStatement:   org?.missionStatement ?? "",
    visionStatement:    org?.visionStatement ?? "",
    programsServices:   org?.programsServices ?? "",
    geographicArea:     org?.geographicArea ?? "",
    targetPopulation:   org?.targetPopulation ?? "",
    website:            org?.website ?? "",
    phone:              org?.phone ?? "",
    email:              org?.email ?? "",
    addressLine1:       org?.addressLine1 ?? "",
    city:               org?.city ?? "",
    state:              org?.state ?? "",
    zip:                org?.zip ?? "",
    annualBudget:       org?.annualBudget?.toString() ?? "",
    fiscalYearEnd:      org?.fiscalYearEnd ?? "December 31",
    hasAudit:           org?.hasAudit ?? false,
    pastGrantsNarrative: org?.pastGrantsNarrative ?? "",
  });

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/organizations/profile", {
        method: org ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          annualBudget: form.annualBudget ? parseFloat(form.annualBudget) : null,
          userId,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      router.refresh();
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const stepContent = [
    // Step 0: Basics
    <div key="basics" className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Input
          label="Organization name"
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Your organization name"
        />
      </div>
      <Input
        label="EIN / Tax ID"
        value={form.ein}
        onChange={(e) => update("ein", e.target.value)}
        placeholder="12-3456789"
        hint="Required for most federal and foundation grants"
      />
      <Select
        label="Organization type"
        required
        options={ORG_TYPE_OPTIONS}
        value={form.orgType}
        onChange={(e) => update("orgType", e.target.value)}
      />
      <Input
        label="Nonprofit status"
        value={form.nonprofitStatus}
        onChange={(e) => update("nonprofitStatus", e.target.value)}
        placeholder="501(c)(3)"
        hint="Leave blank if not a nonprofit"
      />
      <Input
        label="Website"
        type="url"
        value={form.website}
        onChange={(e) => update("website", e.target.value)}
        placeholder="https://yourorg.org"
      />
      <Input
        label="Phone"
        type="tel"
        value={form.phone}
        onChange={(e) => update("phone", e.target.value)}
        placeholder="Your phone number"
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
        placeholder="contact@yourorg.org"
      />
    </div>,

    // Step 1: Mission
    <div key="mission" className="flex flex-col gap-4">
      <Textarea
        label="Mission statement"
        required
        value={form.missionStatement}
        onChange={(e) => update("missionStatement", e.target.value)}
        rows={4}
        placeholder="Describe your organization's core purpose and reason for existence..."
        hint="This is used by the Grant Writer Agent in almost every application. Write it carefully."
      />
      <Textarea
        label="Vision statement"
        value={form.visionStatement}
        onChange={(e) => update("visionStatement", e.target.value)}
        rows={3}
        placeholder="Describe the future your organization is working toward..."
      />
      <Textarea
        label="Programs and services"
        required
        value={form.programsServices}
        onChange={(e) => update("programsServices", e.target.value)}
        rows={5}
        placeholder="Describe each program or service your organization provides. Include estimated reach, frequency, and outcomes..."
        hint="Be specific — include participant numbers, service hours, success rates where known"
      />
      <Textarea
        label="Target population served"
        value={form.targetPopulation}
        onChange={(e) => update("targetPopulation", e.target.value)}
        rows={3}
        placeholder="Who does your organization serve? (ages, demographics, geography, income level, specific needs...)"
      />
      <Textarea
        label="Past grants received"
        value={form.pastGrantsNarrative}
        onChange={(e) => update("pastGrantsNarrative", e.target.value)}
        rows={4}
        placeholder="List significant grants previously received. Include funder name, year, amount, and purpose. Example: 'SAMHSA, 2023, $300,000, MAT expansion program serving Marion County'"
        hint="This helps funders see your track record of responsible grant management"
      />
    </div>,

    // Step 2: Location
    <div key="location" className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Input
          label="Geographic area served"
          value={form.geographicArea}
          onChange={(e) => update("geographicArea", e.target.value)}
          placeholder="e.g., Shelby County and surrounding Indiana counties"
          hint="Be specific — counties, cities, or regions your programs actually reach"
        />
      </div>
      <div className="col-span-2">
        <Input
          label="Street address"
          value={form.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
          placeholder="Street address"
        />
      </div>
      <Input
        label="City"
        value={form.city}
        onChange={(e) => update("city", e.target.value)}
        placeholder="Your city"
      />
      <Select
        label="State"
        options={STATE_OPTIONS}
        placeholder="Select state"
        value={form.state}
        onChange={(e) => update("state", e.target.value)}
      />
      <Input
        label="ZIP code"
        value={form.zip}
        onChange={(e) => update("zip", e.target.value)}
        placeholder="ZIP code"
      />
    </div>,

    // Step 3: Finances
    <div key="finance" className="grid grid-cols-2 gap-4">
      <Input
        label="Annual operating budget ($)"
        type="number"
        value={form.annualBudget}
        onChange={(e) => update("annualBudget", e.target.value)}
        placeholder="850000"
        hint="Most recent full fiscal year total budget"
      />
      <Select
        label="Fiscal year end"
        options={FISCAL_YEAR_OPTIONS}
        value={form.fiscalYearEnd}
        onChange={(e) => update("fiscalYearEnd", e.target.value)}
      />
      <div className="col-span-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.hasAudit}
            onChange={(e) => update("hasAudit", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              We have an independent financial audit
            </span>
            <p className="text-xs text-gray-500">Many funders require audits for grants over $25,000</p>
          </div>
        </label>
      </div>
    </div>,
  ];

  return (
    <Card padding="none">
      {/* Step tabs */}
      <div className="flex border-b border-gray-200 px-5 pt-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors mr-1",
                step === i
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon size={15} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="p-5">
        {stepContent[step]}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-5 pb-5 pt-2 border-t border-gray-100 mt-2">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              ← Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <CheckCircle size={14} /> Saved
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            loading={saving}
          >
            Save
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => { handleSave(); setStep(step + 1); }}>
              Save & Continue →
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save Profile
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
