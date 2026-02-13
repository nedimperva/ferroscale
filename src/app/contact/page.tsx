import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Contact — Advanced Metal Calculator",
  description: "Send a report or get in touch about the Advanced Metal Calculator.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 no-underline transition-colors hover:text-slate-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back to Calculator
        </a>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Contact / Send Report</h1>
        <p className="mt-1 text-sm text-slate-600">
          Found an issue or have a question? Send us a message below.
        </p>
      </header>
      <ContactForm />
    </div>
  );
}
