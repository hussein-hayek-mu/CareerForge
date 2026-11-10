import { WorkspacePage } from "@/components/workspace-page";

export const metadata = { title: "Overview - CareerForge", robots: { index: false, follow: false } };

export default function Dashboard() { return <WorkspacePage view="overview" />; }
