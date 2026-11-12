/**
 * The landing page's centrepiece: a grant application draft as GrantFlow
 * produces it — typed fields, a highlighted fact that still needs checking,
 * and a stamp. Decorative illustration of the product, so hidden from
 * assistive technology; the same points are made in text beside it.
 */
export function ApplicationSheet() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden="true">
      {/* the sheet underneath */}
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[2.5deg] bg-white border border-rule" />

      <div className="relative ruled border border-brand-300 shadow-[0_18px_40px_-18px_rgba(20,33,61,0.45)] -rotate-[1.2deg]">
        {/* form header */}
        <div className="flex items-stretch border-b-2 border-brand-800 bg-white">
          <div className="px-4 py-3 border-r-2 border-brand-800">
            <p className="font-display font-extrabold text-brand-800 leading-none text-lg">Draft</p>
            <p className="text-[11px] text-brand-500 mt-1">Not submitted</p>
          </div>
          <div className="px-4 py-3 flex-1">
            <p className="font-display font-bold text-brand-800 text-[15px] leading-tight">Grant application</p>
            <p className="text-[11px] text-brand-500 mt-0.5">Example of a GrantFlow draft</p>
          </div>
        </div>

        {/* fields */}
        <dl className="grid grid-cols-2 bg-white text-[11px] text-brand-500">
          <div className="px-4 py-2 border-b border-r border-rule">
            <dt>Applicant</dt>
            <dd className="font-type text-[14px] text-brand-800 mt-0.5">Rush County Youth Works</dd>
          </div>
          <div className="px-4 py-2 border-b border-rule">
            <dt>Funder</dt>
            <dd className="font-type text-[14px] text-brand-800 mt-0.5">Community foundation</dd>
          </div>
          <div className="px-4 py-2 border-b border-r border-rule">
            <dt>Amount requested</dt>
            <dd className="font-type text-[14px] text-brand-800 mt-0.5">$15,000</dd>
          </div>
          <div className="px-4 py-2 border-b border-rule">
            <dt>Deadline</dt>
            <dd className="font-type text-[14px] text-stamp-red mt-0.5">Due in 7 days</dd>
          </div>
        </dl>

        {/* narrative */}
        <div className="px-4 pt-3 pb-24 sm:pb-16">
          <p className="text-[11px] text-brand-500">Section 2. Statement of need</p>
          <p className="font-type text-[13.5px] leading-[32px] text-brand-800 mt-[3px]">
            Our after-school program serves{" "}
            <span className="hl">[VERIFY: number of students in 2026]</span> students in Rush County,
            where the nearest comparable program is 22 miles away. Families tell us the
            biggest barrier is transportation.
          </p>
        </div>

        {/* margin note */}
        <div className="absolute left-4 bottom-4 max-w-[150px] sm:max-w-[220px] text-[12px] leading-snug text-brand-600">
          <span className="hl font-semibold text-brand-800">Highlighted</span> means we did not know, so we
          asked instead of guessing.
        </div>

        {/* stamp */}
        <div className="absolute right-5 bottom-5 stamp stamp-in text-stamp-green text-[15px] text-center">
          Ready for<br />your review
        </div>
      </div>
    </div>
  );
}
