import { SuppliedDocumentPage } from "@/components/supplied-document-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "CV & Portfolio - CareerForge", robots: { index: false, follow: false } };

export default function Page() { return <SuppliedDocumentPage />; }
